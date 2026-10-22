import Timeline from '../components/Timeline.jsx'
import { events } from '../data/events.json'
import { uploads } from '../data/uploads.json'

function TimelinePage() {
  return <Timeline uploads={uploads} events={events} />
}

export default TimelinePage
