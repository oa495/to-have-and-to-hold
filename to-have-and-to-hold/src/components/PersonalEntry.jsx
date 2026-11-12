import { shownLocation } from '../location.js'
import './PatchText.css'
import './PersonalEntry.css'

function PersonalEntry({ upload }) {
  return (
    <article className="personal-entry">
      <figure className="personal-entry-photo">
        <img src={upload.image_url} alt={upload.title} draggable={false} />
        <figcaption className="patch-text patch-text--upload">
          <h5>{upload.title}</h5>
          <div>
            <p className="patch-text-meta">
              {shownLocation(upload.location) && `${shownLocation(upload.location)}, `}
              <time dateTime={String(upload.year)}>{upload.year}</time>
            </p>
            <p className="patch-text-meta">{upload.submitter}</p>
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
