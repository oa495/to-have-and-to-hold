import { Link, useParams } from 'react-router'
import UploadView from '../components/UploadView.jsx'
import { uploads } from '../data/uploads.json'

function UploadPage() {
  const { id } = useParams()
  const upload = uploads.find((u) => String(u.id) === id)

  return (
    <div>
      <Link to="/timeline">← Back to timeline</Link>
      {upload ? <UploadView upload={upload} /> : <p>Upload not found.</p>}
    </div>
  )
}

export default UploadPage
