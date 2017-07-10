'use strict';

const Alexa = require('alexa-sdk');
const request = require('request');
const cheerio = require('cheerio');

const APP_ID = undefined;  // TODO replace with your app ID (OPTIONAL).

const languageStrings = {
    'en': {
        translation: {
            SKILL_NAME: 'Verse of the Day',
            HELP_MESSAGE: 'Ask for the verse of the day.',
            CREDIT_MESSAGE: 'Verse of the Day shared from Bible.com',
            STOP_MESSAGE: 'Goodbye!',
            URL: "https://www.bible.com/verse-of-the-day"
        },
    },
};

const handlers = {
    'LaunchRequest': function () {
        this.emit('GetVerse');
    },
    'GetVerseIntent': function () {
        this.emit('GetVerse');
    },
    'GetVerse': function () {
        var that = this;
        request(this.t('URL'), function(err, response, body) {
            const parsed = cheerio.load(body)
            var content = parsed('meta[name="Description"]').attr('content');
            var verse = parsed('meta[property="og:title"]').attr('content');
            var speechOutput = verse + ' ' + content + ' ' + that.t('CREDIT_MESSAGE');
            that.emit(':tell', speechOutput);
        });
    },
    'AMAZON.HelpIntent': function () {
        const speechOutput = this.t('HELP_MESSAGE');
        const reprompt = this.t('HELP_MESSAGE');
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
};

exports.handler = function (event, context) {
    const alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    // To enable string internationalization (i18n) features, set a resources object.
    alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);
    alexa.execute();
};
