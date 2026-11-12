import Timeline from '../components/Timeline.jsx'
import { uploads } from '../data/uploads.json'
import { useEvents } from '../data/useEvents.js'

function TimelinePage() {
  // Events come from Cheta; until they load (or if they fail) the timeline
  // shows just the uploads.
  const { events } = useEvents()
  return <Timeline uploads={uploads} events={events} />
}

export default TimelinePage
