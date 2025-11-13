import './BuildTimestampBadge.css'

const BUILD_TIMESTAMP_PLACEHOLDER = '__BUILD_TIMESTAMP__'

function BuildTimestampBadge() {
  return (
    <div className="build-timestamp" data-build-timestamp={BUILD_TIMESTAMP_PLACEHOLDER}>
      Build timestamp unavailable
    </div>
  )
}

export default BuildTimestampBadge
