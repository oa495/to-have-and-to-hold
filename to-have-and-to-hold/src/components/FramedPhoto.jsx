import './FramedPhoto.css'

function formatMonth(year, month) {
  return new Date(year, month - 1).toLocaleString('default', { month: 'long' })
}

function FramedPhoto({ upload }) {
  return (
    <figure className="photo-frame">
      <img src={upload.image_url} alt={upload.title} draggable={false} />
      <figcaption>
        <span className="photo-frame-title">{upload.title}</span>
        <span>
          <time dateTime={`${upload.year}-${String(upload.month).padStart(2, '0')}`}>
            {formatMonth(upload.year, upload.month)} {upload.year}
          </time>
          {upload.location && ` | ${upload.location}`}
          {' | '}
          {upload.submitter}
        </span>
      </figcaption>
    </figure>
  )
}

export default FramedPhoto
