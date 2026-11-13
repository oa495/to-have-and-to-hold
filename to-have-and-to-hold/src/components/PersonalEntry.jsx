import { shownLocation } from '../location.js'
import './PatchText.css'
import './PersonalEntry.css'

// Also shows timeline events, which can have no photo and have no submitter.
function PersonalEntry({ upload }) {
  const details = (
    <p className="patch-text-meta">
      {shownLocation(upload.location) && `${shownLocation(upload.location)}, `}
      <time dateTime={String(upload.year)}>{upload.date_display ?? upload.year}</time>
    </p>
  )

  // No photo: the title, description and details all go on the text patch.
  if (!upload.image_url) {
    return (
      <article className="personal-entry personal-entry--text">
        <div className="personal-entry-desc">
          <h5>{upload.title}</h5>
          {upload.description && <p>{upload.description}</p>}
          {details}
        </div>
      </article>
    )
  }

  return (
    <article className="personal-entry">
      <figure className="personal-entry-photo">
        <img src={upload.image_url} alt={upload.title} draggable={false} />
        <figcaption className="patch-text patch-text--upload">
          <h5>{upload.title}</h5>
          <div>
            {details}
            {upload.submitter && <p className="patch-text-meta">{upload.submitter}</p>}
          </div>
        </figcaption>
      </figure>
      {upload.description && (
        <div className="personal-entry-desc">
          <p>{upload.description}</p>
        </div>
      )}
    </article>
  )
}

export default PersonalEntry
