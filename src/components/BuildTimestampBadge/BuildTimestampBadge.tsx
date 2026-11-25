import { getBuildTimestamp } from '../../utils/getBuildTimestamp'

/** When the site was last built, filled in after load by hydrateBuildTimestampBadges (it changes on every deploy). */
function BuildTimestampBadge() {
  return (
    <p className="type-caption text-ink-muted md:text-end" data-build-timestamp={getBuildTimestamp()}>
      Build timestamp unavailable
    </p>
  )
}

export default BuildTimestampBadge
