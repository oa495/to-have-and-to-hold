import './PatchText.css'

function EventCard({ event }) {
  // Small blocks only have room for the image and title.
  const showDetails = (event.significance ?? 1) >= 3
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
        {showDetails && event.location && (
          <p className="patch-text-meta">{event.location}</p>
        )}
      </div>
    </article>
  )
}

export default EventCard
