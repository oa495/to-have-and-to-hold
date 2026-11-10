import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import EventCard from './EventCard.jsx'
import './Timeline.css'

const DRAG_THRESHOLD = 5

// Grid cells [columns, rows] a block covers, by event significance (1-5).
const SIGNIFICANCE_SPANS = { 1: [1, 1], 2: [2, 1], 3: [2, 2], 4: [3, 2], 5: [3, 3] }
const UPLOAD_SPAN = [3, 3]

// A repeatable value in [-1, 1] per seed, so patches sit the same way every load.
function wobble(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return (x - Math.floor(x)) * 2 - 1
}

// Grid placement plus a fixed offset and tilt so patches sit loosely. Kept
// small vertically so patches in the top and bottom rows stay on screen.
function patchStyle([cols, rows], seed, tilt) {
  return {
    gridColumn: `span ${cols}`,
    gridRow: `span ${rows}`,
    transform: `translate(${wobble(seed) * 14}px, ${wobble(seed + 1) * 6}px) rotate(${wobble(seed + 2) * tilt}deg)`,
  }
}

const EVENTS_PER_YEAR = 4

// A year's events, cut to EVENTS_PER_YEAR: one per significance level from
// the top down, so each year shows a spread of patch sizes, topped up with
// the most significant of the rest. Within a level, events with a photo come
// first so photo patches show at every size. Kept in id order.
function pickEvents(yearEvents) {
  const bySignificance = [...yearEvents].sort(
    (a, b) =>
      (b.significance ?? 1) - (a.significance ?? 1) || Boolean(b.image_url) - Boolean(a.image_url),
  )
  const levels = new Set()
  const picked = bySignificance.filter((e) => {
    const level = e.significance ?? 1
    if (levels.has(level)) return false
    levels.add(level)
    return true
  })
  for (const e of bySignificance) {
    if (picked.length >= EVENTS_PER_YEAR) break
    if (!picked.includes(e)) picked.push(e)
  }
  return picked.slice(0, EVENTS_PER_YEAR).sort((a, b) => a.id - b.id)
}

// One quilt per year from the earliest to the latest year in either dataset.
// The year's events are its blocks; its uploads are stitched in among them,
// spread evenly through the sequence.
function buildYears(uploads, events) {
  const years = [...uploads, ...events].map((item) => item.year)
  const result = []
  for (let year = Math.min(...years); year <= Math.max(...years); year++) {
    const yearUploads = uploads
      .filter((u) => u.year === year)
      .sort((a, b) => a.month - b.month)
    const items = pickEvents(events.filter((e) => e.year === year)).map((event) => ({
      type: 'event',
      event,
    }))
    const step = Math.floor(items.length / (yearUploads.length + 1))
    yearUploads.forEach((upload, i) => {
      items.splice(step * (i + 1) + i, 0, { type: 'upload', upload })
    })
    result.push({ year, items })
  }
  return result
}

function UploadPatch({ upload }) {
  return (
    <li className="quilt-patch" style={patchStyle(UPLOAD_SPAN, upload.id * 7, 2.5)}>
      <Link to={`/uploads/${upload.id}`} draggable={false}>
        <figure>
          <img src={upload.image_url} alt={upload.title} draggable={false} />
          <figcaption>
            {upload.title} · {upload.year}
          </figcaption>
        </figure>
      </Link>
    </li>
  )
}

function QuiltBlock({ event }) {
  const significance = event.significance ?? 1
  return (
    <li
      className={`quilt-block${significance >= 3 ? ' quilt-block--large' : ''}`}
      style={{
        ...patchStyle(SIGNIFICANCE_SPANS[significance], event.id, 1.5),
        '--significance': significance,
        zIndex: significance,
      }}
    >
      <EventCard event={event} />
    </li>
  )
}

function Timeline({ uploads, events }) {
  const scrollerRef = useRef(null)
  const dragRef = useRef(null)
  const didDragRef = useRef(false)
  // The year whose quilt is under the middle of the screen; null on the title.
  const [currentYear, setCurrentYear] = useState(null)

  const years = buildYears(uploads, events)

  // Turn vertical wheel movement into horizontal scrolling.
  useEffect(() => {
    const scroller = scrollerRef.current
    function onWheel(e) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      e.preventDefault()
      const lineHeight = e.deltaMode === 1 ? 16 : 1
      scroller.scrollLeft += e.deltaY * lineHeight
    }
    scroller.addEventListener('wheel', onWheel, { passive: false })
    return () => scroller.removeEventListener('wheel', onWheel)
  }, [])

  // Track which year is under the middle of the screen, once per frame.
  useEffect(() => {
    const scroller = scrollerRef.current
    let frame = 0
    let shown
    function update() {
      frame = 0
      const middle = window.innerWidth / 2
      let year = null
      for (const el of scroller.querySelectorAll('.timeline-year')) {
        if (el.getBoundingClientRect().left > middle) break
        year = Number(el.dataset.year)
      }
      // Only touch React when the year actually changes.
      if (year !== shown) {
        shown = year
        setCurrentYear(year)
      }
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      scroller.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  // Click-and-drag panning for mouse; touch already scrolls natively.
  function handlePointerDown(e) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    didDragRef.current = false
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScrollLeft: scrollerRef.current.scrollLeft,
    }
  }

  function handlePointerMove(e) {
    const drag = dragRef.current
    if (!drag) return
    const dx = e.clientX - drag.startX
    if (!didDragRef.current && Math.abs(dx) > DRAG_THRESHOLD) {
      didDragRef.current = true
      scrollerRef.current.setPointerCapture(drag.pointerId)
    }
    if (didDragRef.current) {
      scrollerRef.current.scrollLeft = drag.startScrollLeft - dx
    }
  }

  function handlePointerUp() {
    dragRef.current = null
  }

  // A drag shouldn't also open the photo it ended on.
  function handleClickCapture(e) {
    if (didDragRef.current) {
      e.preventDefault()
      e.stopPropagation()
      didDragRef.current = false
    }
  }

  return (
    <div
      className="timeline"
      ref={scrollerRef}
      tabIndex={0}
      aria-label="Photo timeline"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClickCapture={handleClickCapture}
    >
      <header className="timeline-panel">
        {/* A badge: the cover photo in a circle, the title wrapped round it. */}
        <h1 aria-label="To Have And To Hold">
          <svg viewBox="0 0 1000 1000" aria-hidden="true">
            <defs>
              <clipPath id="cover-clip">
                <circle cx="500" cy="500" r="290" />
              </clipPath>
              {/* Over the top, letters standing outward. */}
              <path id="title-top" d="M 185,500 A 315,315 0 0 1 815,500" />
              {/* Under the bottom, left to right, letters upright toward the photo. */}
              <path id="title-bottom" d="M 115,500 A 385,385 0 0 0 885,500" />
            </defs>
            <image
              href="/cover.webp"
              x="210"
              y="210"
              width="580"
              height="580"
              preserveAspectRatio="xMidYMid slice"
              clipPath="url(#cover-clip)"
              opacity="0.60"
            />
            <text>
              <textPath href="#title-top" startOffset="50%" textAnchor="middle">
                TO HAVE
              </textPath>
            </text>
            <text>
              <textPath href="#title-bottom" startOffset="50%" textAnchor="middle">
                TO HOLD
              </textPath>
            </text>
            <text x="120" y="550" textAnchor="middle">&amp;</text>
            <text x="880" y="550" textAnchor="middle">&amp;</text>
          </svg>
        </h1>
      </header>
      <ol className="timeline-track">
        {years.map(({ year, items }) => (
          <li className="timeline-year" key={year} data-year={year}>
            <h2>{year}</h2>
            <ol className="quilt">
              {items.map((item) =>
                item.type === 'upload' ? (
                  <UploadPatch upload={item.upload} key={`upload-${item.upload.id}`} />
                ) : (
                  <QuiltBlock event={item.event} key={item.event.id} />
                ),
              )}
            </ol>
          </li>
        ))}
      </ol>
      {/* The current year, fixed bottom-right; the key replays its entrance
          animation each time the year changes. Visual only: the per-year
          headings above carry it for screen readers. */}
      {currentYear !== null && (
        <p className="timeline-current-year" key={currentYear} aria-hidden="true">
          {currentYear}
        </p>
      )}
    </div>
  )
}

export default Timeline
