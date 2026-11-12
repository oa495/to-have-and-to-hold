import { Link, useParams } from 'react-router'
import UploadView from '../components/UploadView.jsx'
import './UploadPage.css'
import { uploads } from '../data/uploads.json'
import { findUpload } from '../uploadSlug.js'

function UploadPage() {
  const { submitter, slug } = useParams()
  const upload = findUpload(uploads, submitter, slug)

  return (
    <div>
      <Link to="/timeline" className="back-link" aria-label="Back to timeline">
        ←
      </Link>
      {upload ? <UploadView upload={upload} /> : <p>Upload not found.</p>}
    </div>
  )
}

export default UploadPage
