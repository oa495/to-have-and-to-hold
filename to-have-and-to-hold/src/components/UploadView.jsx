
function formatMonth(year, month) {
  return new Date(year, month - 1).toLocaleString('default', { month: 'long' })
}

function UploadView({ upload }) {
  return (
    <figure>
      <img src={upload.image_url} alt={upload.title} />
      <figcaption>
        <time dateTime={`${upload.year}-${String(upload.month).padStart(2, '0')}`}>
          {formatMonth(upload.year, upload.month)} {upload.year}
        </time>
        <h2>{upload.title}</h2>
        <p>Shared by {upload.submitter}</p>
      </figcaption>
    </figure>
  )
}

export default UploadView
