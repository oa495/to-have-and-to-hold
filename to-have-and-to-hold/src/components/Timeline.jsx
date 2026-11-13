import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import EventCard from './EventCard.jsx'
import { shownLocation } from '../location.js'
import { patchStyle, pickEvents, wobble } from '../quiltLayout.js'
import { uploadPath } from '../uploadSlug.js'
import { yearFromHash, yearHash } from '../yearHash.js'
import './PatchText.css'
import './Timeline.css'

const DRAG_THRESHOLD = 5

// How long scrolling must settle before the URL hash follows the year. Keeps
// fast drags under Safari's limit on history updates.
const URL_SYNC_DELAY = 250

// Grid cells [columns, rows] a block covers, by event significance (1-5).
const SIGNIFICANCE_SPANS = { 1: [1, 1], 2: [2, 1], 3: [2, 2], 4: [3, 2], 5: [3, 3] }
const UPLOAD_SPAN = [3, 3]

// One quilt per year from the earliest to the latest year in either dataset.
// The year's events are its blocks; its uploads are stitched in among them,
// spread evenly through the sequence.
function buildYears(uploads, events) {
  const years = [...uploads, ...events].map((item) => item.year)
  const result = []
  for (let year = Math.min(...years); year <= Math.max(...years); year++) {
    const yearUploads = uploads.filter((u) => u.year === year)
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
  // The author label's tilt: 2-4deg either way, never near straight.
  const w = wobble(upload.id * 3)
  const authorTilt = Math.sign(w || 1) * (2 + Math.abs(w) * 2)
  return (
    <li className="quilt-patch" style={patchStyle(UPLOAD_SPAN, upload.id * 7, 2.5)}>
      <Link to={uploadPath(upload)} draggable={false}>
        <figure>
          <img src={upload.image_url} alt={upload.title} draggable={false} />
          <figcaption className="patch-text patch-text--upload">
            <h5>{upload.title}</h5>
            <div className="quilt-patch-meta">
              <p className="patch-text-meta">
                {shownLocation(upload.location) && `${shownLocation(upload.location)}, `}
                <time dateTime={String(upload.year)}>{upload.date_display ?? upload.year}</time>
              </p>
              <span
                className="author-patch"
                style={{ '--author-tilt': `${authorTilt}deg` }}
              >
                {upload.submitter}
              </span>
            </div>
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

  // Track which year is under the middle of the screen, once per frame, and
  // put it in the URL hash once scrolling settles.
  useEffect(() => {
    const scroller = scrollerRef.current
    let frame = 0
    let urlTimer = 0
    let shown
    function update() {
      frame = 0
      const middle = window.innerWidth / 2
      const yearEls = scroller.querySelectorAll('.timeline-year')
      let year = null
      for (const el of yearEls) {
        if (el.getBoundingClientRect().left > middle) break
        year = Number(el.dataset.year)
      }
      // The last year may never reach the middle, so scrolled right to the
      // end shows it.
      const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1
      if (atEnd && yearEls.length) year = Number(yearEls[yearEls.length - 1].dataset.year)
      // Only touch React when the year actually changes.
      if (year !== shown) {
        shown = year
        setCurrentYear(year)
      }
    }
    // Replace rather than push, so scrolling doesn't fill the back button, and
    // keep the router's history state. On the title the hash is cleared.
    function syncUrl() {
      if (shown === undefined) return
      const hash = shown === null ? '' : yearHash(shown)
      if (window.location.hash === hash) return
      const { pathname, search } = window.location
      window.history.replaceState(window.history.state, '', pathname + search + hash)
    }
    // Only scrolling moves the URL: the first update() below runs before any
    // hash year has been scrolled to, and mustn't wipe it.
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update)
      clearTimeout(urlTimer)
      urlTimer = setTimeout(syncUrl, URL_SYNC_DELAY)
    }
    update()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(urlTimer)
      scroller.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  // Scroll to the year in the URL hash (/timeline#1994): on load, once that
  // year's quilt has rendered, and whenever the hash is edited by hand
  // (syncUrl above doesn't fire hashchange, so no loop). The quilt is
  // centred, so it's the one the current-year label (above) picks.
  useEffect(() => {
    const scroller = scrollerRef.current
    function scrollToHashYear() {
      const year = yearFromHash(window.location.hash)
      const el = scroller.querySelector(`.timeline-year[data-year="${year}"]`)
      if (!el) return
      const { left, width } = el.getBoundingClientRect()
      scroller.scrollLeft += left + width / 2 - window.innerWidth / 2
    }
    scrollToHashYear()
    window.addEventListener('hashchange', scrollToHashYear)
    return () => window.removeEventListener('hashchange', scrollToHashYear)
  }, [years.length])

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
