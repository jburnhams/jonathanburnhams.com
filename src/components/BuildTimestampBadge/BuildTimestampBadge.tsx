import './BuildTimestampBadge.css'
import { getBuildTimestamp } from '../../utils/getBuildTimestamp'

function BuildTimestampBadge() {
  const buildTimestamp = getBuildTimestamp()

  return (
    <div className="build-timestamp" data-build-timestamp={buildTimestamp}>
      Build timestamp unavailable
    </div>
  )
}

export default BuildTimestampBadge
