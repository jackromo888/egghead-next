import {track} from './track'
import {identify} from './identify'
import {
  activityInternalLinkClick,
  activityExternalLinkClick,
  activityCtaClick,
  engagementSearchedWithQuery,
  engagementWatchedTalk,
} from './events'

const events = {
  activityInternalLinkClick,
  activityExternalLinkClick,
  activityCtaClick,
  engagementSearchedWithQuery,
  engagementWatchedTalk,
}

const analytics = {
  track,
  identify,
  events,
}

export default analytics
