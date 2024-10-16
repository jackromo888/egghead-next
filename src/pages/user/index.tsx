import * as React from 'react'
import {find, first} from 'lodash'
import {useQuery} from '@tanstack/react-query'

import {useViewer} from 'context/viewer-context'
import {loadAccount} from 'lib/accounts'
import {loadUserProgress, loadUserCompletedCourses} from 'lib/users'
import {convertMintoHours} from 'utils/time-utils'
import LoginRequired, {LoginRequiredParams} from 'components/login-required'
import RequestEmailChangeForm from 'components/users/request-email-change-form'
import SubscriptionDetails from 'components/users/subscription-details'
import InProgressResource from 'components/pages/users/dashboard/activity/in-progress-resource'
import CompletedCourses from 'components/pages/users/completed-courses'

const GithubConnectButton: React.FunctionComponent<{
  authToken: string
}> = ({authToken}) => {
  return (
    <a
      href={`${process.env.NEXT_PUBLIC_AUTH_DOMAIN}/users/github_passthrough?client_id=${process.env.NEXT_PUBLIC_CLIENT_ID}&auth_token=${authToken}`}
      className="inline-block px-4 py-3 text-white bg-blue-600 border-0 rounded focus:outline-none hover:bg-blue-700"
    >
      Connect your GitHub account
    </a>
  )
}

type ViewerAccount = {
  stripe_customer_id: string
  slug: string
  subscriptions: any[]
}

function getAccountWithSubscription(accounts: ViewerAccount[]) {
  // prefer the account with a subscription, otherwise grab the first, or just
  // an empty object (which would be an error state, but possible)
  return (
    find<ViewerAccount>(
      accounts,
      (account: ViewerAccount) => account.subscriptions?.length > 0,
    ) ||
    first<ViewerAccount>(accounts) || {slug: ''}
  )
}

function useProgressForUser(viewerId: number) {
  return useQuery(['progress'], async () => {
    if (viewerId) {
      const {
        progress: {data},
        completionStats,
      } = await loadUserProgress(viewerId)

      return {
        progress: data.filter((p: any) => !p.is_complete),
        completionStats,
      }
    }
  })
}

function useUserCompletedCourses(viewerId: number) {
  return useQuery(['completeCourses'], async () => {
    if (viewerId) {
      const {completeCourses} = await loadUserCompletedCourses()
      return completeCourses
    }
  })
}

const User: React.FunctionComponent<
  LoginRequiredParams & {account: ViewerAccount}
> = () => {
  const [account, setAccount] = React.useState<ViewerAccount>()
  const {viewer, authToken} = useViewer()
  const {email: currentEmail, accounts, providers} = viewer || {}
  const {slug} = getAccountWithSubscription(accounts)
  const isConnectedToGithub = providers?.includes('github')
  const viewerId = viewer?.id
  const {
    status: progressStatus,
    data: progressData,
    error,
  } = useProgressForUser(viewerId)
  const {
    status: completeCourseStatus,
    data: completeCourseData,
    error: completeCourseError,
  } = useUserCompletedCourses(viewerId)

  React.useEffect(() => {
    const loadAccountForSlug = async (slug: string) => {
      if (slug) {
        const account: any = await loadAccount(slug, authToken)
        setAccount(account)
      }
    }

    loadAccountForSlug(slug)
  }, [slug, authToken])

  return (
    <LoginRequired>
      <main className="container py-5 mb-16">
        <div className="flex flex-col max-w-screen-md mx-auto space-y-10 sm:space-y-16">
          {/* Account details */}
          <div className="sm:px-6 lg:px-0 lg:col-span-9">
            <div className="flex gap-4 sm:justify-between flex-wrap">
              <RequestEmailChangeForm originalEmail={currentEmail} />
              <div>
                {progressStatus === 'loading' ? (
                  <p className="text-center mt-6">Loading...</p>
                ) : progressStatus === 'error' ? (
                  <span>There was an error fetching stats</span>
                ) : (
                  <>
                    <LearnerStats
                      completionStats={progressData?.completionStats}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
          {progressStatus === 'loading' ? (
            <p className="text-center mt-6">Loading courses in progress...</p>
          ) : progressStatus === 'error' ? (
            <span>There was an error fetching courses in progress.</span>
          ) : (
            <>
              <div className="flex flex-col space-y-2">
                <h2 className="pb-1 text-xl border-b border-gray-200 dark:border-gray-800">
                  Continue learning
                </h2>
                {progressData?.progress.map((item: any) => {
                  return (
                    <InProgressResource
                      key={item.collection.title}
                      resource={item.collection}
                    />
                  )
                })}
              </div>
            </>
          )}
          {completeCourseStatus === 'loading' ? (
            <p className="text-center mt-6">Loading completed courses...</p>
          ) : completeCourseStatus === 'error' ? (
            <span>There was an error fetching completed courses.</span>
          ) : (
            <CompletedCourses completeCourseData={completeCourseData} />
          )}
          {/* Connect to GitHub */}
          {isConnectedToGithub ? (
            <div className="sm:px-6 lg:px-0 lg:col-span-9">
              <div className="flex flex-col space-y-2">
                <h2 className="pb-1 text-xl border-b border-gray-200 dark:border-gray-800">
                  Your Account is Connected to Github
                </h2>
                <p>
                  You are able to login to egghead using your Github account!
                </p>
              </div>
            </div>
          ) : (
            <div className="sm:px-6 lg:px-0 lg:col-span-9">
              <div className="flex flex-col space-y-2">
                <h2 className="pb-1 text-xl border-b border-gray-200 dark:border-gray-800">
                  Connect to GitHub
                </h2>
                <p>Connect your GitHub account to log in with GitHub Oauth.</p>
                <div className="pt-2">
                  <GithubConnectButton authToken={authToken} />
                </div>
              </div>
            </div>
          )}
          {account && (
            <SubscriptionDetails
              stripeCustomerId={account.stripe_customer_id}
              slug={slug}
            />
          )}
        </div>
      </main>
    </LoginRequired>
  )
}

const LearnerStats = ({completionStats}: any) => (
  <div className="flex flex-col space-y-2 sm:grow-0 grow">
    <h2 className="pb-1 text-xl border-b border-gray-200 dark:border-gray-800">
      Learner Stats
    </h2>
    <p>
      <b>{convertMintoHours(completionStats.minutesWatched)}</b> watched
    </p>
    <p>
      <b>{completionStats.completedCourseCount} courses</b> completed
    </p>
    <p>
      <b>{completionStats.completedLessonCount} lessons</b> completed
    </p>
  </div>
)

export default User
