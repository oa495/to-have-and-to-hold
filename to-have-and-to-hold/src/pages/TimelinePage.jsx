import Timeline from '../components/Timeline.jsx'
import { useArchives } from '../data/useArchives.js'

function TimelinePage() {
  // While loading (or on error) the timeline shows just its title panel.
  const { events, uploads } = useArchives()
  return <Timeline uploads={uploads} events={events} />
}

export default TimelinePage
