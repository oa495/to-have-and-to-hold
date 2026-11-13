import Timeline from '../components/Timeline.jsx'
import { useEvents } from '../data/useEvents.js'
import { useUploads } from '../data/useUploads.js'

function TimelinePage() {
  // Both come from Cheta and load side by side; each shows once it arrives.
  const { events } = useEvents()
  const { uploads } = useUploads()
  return <Timeline uploads={uploads} events={events} />
}

export default TimelinePage
