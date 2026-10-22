import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import EventCard from './EventCard.jsx'
import FramedPhoto from './FramedPhoto.jsx'
import './Timeline.css'

const DRAG_THRESHOLD = 5

// One segment per year from the earliest to the latest year in either dataset.
// A year with uploads gets one full-screen panel per upload, with that year's
// events split between them; a year without uploads gets a strip of events.
function buildYears(uploads, events) {
  const years = [...uploads, ...events].map((item) => item.year)
  const result = []
  for (let year = Math.min(...years); year <= Math.max(...years); year++) {
    const yearUploads = uploads
      .filter((u) => u.year === year)
      .sort((a, b) => a.month - b.month)
    const yearEvents = events.filter((e) => e.year === year)
    const perPanel = Math.ceil(yearEvents.length / yearUploads.length)
    result.push({
      year,
      events: yearEvents,
      panels: yearUploads.map((upload, i) => ({
        upload,
        events: yearEvents.slice(i * perPanel, (i + 1) * perPanel),
      })),
    })
  }
  return result
}

function UploadPanel({ upload, events }) {
  const half = Math.ceil(events.length / 2)
  return (
    <div className="upload-panel">
      <div className="event-band">
        {events.slice(0, half).map((event) => (
          <EventCard event={event} key={event.id} />
        ))}
      </div>
      <Link to={`/uploads/${upload.id}`} draggable={false}>
        <FramedPhoto upload={upload} />
      </Link>
      <div className="event-band">
        {events.slice(half).map((event) => (
          <EventCard event={event} key={event.id} />
        ))}
      </div>
    </div>
  )
}

function Timeline({ uploads, events }) {
  const scrollerRef = useRef(null)
  const dragRef = useRef(null)
  const didDragRef = useRef(false)

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
        <h1>To Have And To Hold</h1>
      </header>
      <ol className="timeline-track">
        {years.map(({ year, events, panels }) => (
          <li className="timeline-year" key={year}>
            <h2>{year}</h2>
            {panels.length > 0 ? (
              panels.map(({ upload, events }) => (
                <UploadPanel upload={upload} events={events} key={upload.id} />
              ))
            ) : (
              <div className="event-grid">
                {events.map((event) => (
                  <EventCard event={event} key={event.id} />
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

export default Timeline
