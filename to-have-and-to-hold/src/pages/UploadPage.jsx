import { Link, useParams } from 'react-router'
import UploadView from '../components/UploadView.jsx'
import './UploadPage.css'
import { useUploads } from '../data/useUploads.js'
import { findUpload } from '../uploadSlug.js'
import { yearHash } from '../yearHash.js'

function UploadPage() {
  const { submitter, slug } = useParams()
  const { status, uploads } = useUploads()
  const upload = findUpload(uploads, submitter, slug)

  let content
  if (upload) content = <UploadView upload={upload} />
  else if (status === 'loading') content = <p>Loading…</p>
  else if (status === 'error') content = <p>Couldn’t load the archive.</p>
  else content = <p>Upload not found.</p>

  return (
    <div>
      {/* Back to this photo's year on the timeline, which centres #year. */}
      <Link
        to={upload ? `/timeline${yearHash(upload.year)}` : '/timeline'}
        className="back-link"
        aria-label="Back to timeline"
      >
        ←
      </Link>
      {content}
    </div>
  )
}

export default UploadPage
