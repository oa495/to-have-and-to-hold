function EventCard({ event }) {
  return (
    <article className="event-card">
      {event.image_url && <img src={event.image_url} alt="" draggable={false} />}
      <strong>{event.title}</strong>
      <p>{event.desc}</p>
    </article>
  )
}

export default EventCard
