import { shownLocation } from '../location.js'
import './PatchText.css'

function EventCard({ event, onOpen }) {
  // Small blocks only have room for the image and title.
  const showDetails = (event.significance ?? 1) >= 3
  const location = shownLocation(event.location)
  // One patch: with a photo, the photo sits at the top and the text under it;
  // without one, the text sits on the plain text-only patch.
  return (
    <article
      className={`event-card event-card--${event.image_url ? 'photo' : 'text'}`}
    >
      <div className="event-card-body patch-text">
        {event.image_url && <img src={event.image_url} alt="" draggable={false} />}
        <h5>{event.title}</h5>
        {showDetails && <p>{event.desc}</p>}
        {showDetails && location && (
          <p className="patch-text-meta">{location}</p>
        )}
      </div>
      {/* Over the whole patch, so a click anywhere opens the full event. */}
      <button
        type="button"
        className="event-card-open"
        aria-label={`Read more: ${event.title}`}
        onClick={() => onOpen(event)}
      />
    </article>
  )
}

export default EventCard
