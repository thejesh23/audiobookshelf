const { expect } = require('chai')
const FeedEpisode = require('../../../server/models/FeedEpisode')

describe('FeedEpisode', () => {
  describe('getFeedEpisodeObjFromAudiobookTrack', () => {
    const originalTZ = process.env.TZ

    afterEach(() => {
      if (originalTZ === undefined) delete process.env.TZ
      else process.env.TZ = originalTZ
    })

    const book = { title: 'Book', description: '', includedAudioFiles: [{}], chapters: [] }
    const feed = { author: 'Author', siteURL: 'http://localhost/item/1' }
    const audioTrack = { metadata: { filename: 'track.mp3', size: 100, path: '/books/track.mp3' }, mimeType: 'audio/mpeg', duration: 60, startOffset: 0 }

    const cases = [
      // [server timezone, pubDateStart, offsetIndex, expected pubDate]
      ['America/New_York', '2015-02-04T00:00:00Z', 0, 'Wed, 04 Feb 2015 00:00:00 GMT'],
      ['Asia/Kolkata', '2015-02-04T00:00:00Z', 2, 'Wed, 04 Feb 2015 00:02:00 GMT'],
      ['America/New_York', '2015-03-08T06:30:00Z', 0, 'Sun, 08 Mar 2015 06:30:00 GMT'], // DST starts at 07:00 UTC
      ['America/New_York', '2026-11-01T05:30:00Z', 0, 'Sun, 01 Nov 2026 05:30:00 GMT'], // DST ends at 06:00 UTC
      ['UTC', '2015-02-04T00:00:00Z', 1, 'Wed, 04 Feb 2015 00:01:00 GMT']
    ]

    for (const [tz, pubDateStart, offsetIndex, expected] of cases) {
      it(`formats pubDate in GMT when the server timezone is ${tz} (${pubDateStart} + ${offsetIndex} min)`, () => {
        process.env.TZ = tz
        const episode = FeedEpisode.getFeedEpisodeObjFromAudiobookTrack(book, new Date(pubDateStart), feed, 'slug', audioTrack, false, offsetIndex)
        expect(episode.pubDate).to.equal(expected)
      })
    }
  })
})
