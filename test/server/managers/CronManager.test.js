const { expect } = require('chai')
const sinon = require('sinon')
const cron = require('../../../server/libs/nodeCron')
const Database = require('../../../server/Database')
const Logger = require('../../../server/Logger')
const CronManager = require('../../../server/managers/CronManager')

describe('CronManager', () => {
  describe('executePodcastCron', () => {
    let scheduledCallbacks

    beforeEach(() => {
      scheduledCallbacks = {}
      sinon.stub(cron, 'schedule').callsFake((expression, callback) => {
        scheduledCallbacks[expression] = callback
        return { stop: sinon.stub() }
      })
      sinon.stub(Logger, 'debug')
      sinon.stub(Logger, 'info')
      sinon.stub(Logger, 'warn')
      sinon.stub(Logger, 'error')
    })

    afterEach(() => {
      sinon.restore()
    })

    it('clears the executing flag when the cron is removed because it has no items left', async () => {
      const expression = '0 * * * *'
      sinon.stub(Database, 'libraryItemModel').get(() => ({
        getExpandedById: sinon.stub().resolves(null)
      }))
      const podcastManager = { runEpisodeCheck: sinon.stub().resolves(true) }
      const cronManager = new CronManager(podcastManager, {})

      cronManager.startPodcastCron(expression, ['deleted-item'])
      await cronManager.executePodcastCron(expression)

      expect(cronManager.podcastCrons).to.have.length(0)
      expect(cronManager.podcastCronExpressionsExecuting).to.not.include(expression)
    })

    it('runs episode checks for a podcast added later on the same schedule', async () => {
      const expression = '0 * * * *'
      const newLibraryItem = { id: 'new-item' }
      sinon.stub(Database, 'libraryItemModel').get(() => ({
        getExpandedById: sinon.stub().callsFake(async (id) => (id === 'new-item' ? newLibraryItem : null))
      }))
      const podcastManager = { runEpisodeCheck: sinon.stub().resolves(true) }
      const cronManager = new CronManager(podcastManager, {})

      // Last podcast on the schedule was deleted, so the cron is removed
      cronManager.startPodcastCron(expression, ['deleted-item'])
      await cronManager.executePodcastCron(expression)

      // A podcast is later added on the same schedule
      cronManager.startPodcastCron(expression, ['new-item'])
      const executeSpy = sinon.spy(cronManager, 'executePodcastCron')
      scheduledCallbacks[expression]()

      expect(executeSpy.calledOnce).to.be.true
      await executeSpy.firstCall.returnValue

      expect(podcastManager.runEpisodeCheck.calledOnceWith(newLibraryItem)).to.be.true
    })
  })
})
