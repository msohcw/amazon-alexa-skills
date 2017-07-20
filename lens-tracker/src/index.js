'use strict';

const Alexa = require('alexa-sdk');
const request = require('request');
const firebase = require('firebase');
var moment = require('moment');

var config = {
    apiKey: "***REMOVED***",
    authDomain: "lens-tracker.firebaseapp.com",
    databaseURL: "https://lens-tracker.firebaseio.com",
    projectId: "lens-tracker",
    storageBucket: "lens-tracker.appspot.com",
    messagingSenderId: "1092030441079"
  };
firebase.initializeApp(config);

const database = firebase.database();

const APP_ID = undefined;  // TODO replace with your app ID (OPTIONAL).

const languageStrings = {
    'en': {
        translation: {
            SKILL_NAME: 'Lenses Tracker',
            HELP_MESSAGE: 'Say Reset when you\'re putting on a new pair of contact lenses. Say How Long to find out the last time you changed contact lenses',
            STOP_MESSAGE: 'Goodbye!',
            RESET_MESSAGE: 'Okay! Remember to keep those lenses clean.',
            SINCE_MESSAGE: 'You have used those lenses for $htime. You put them on on $date.',
            WARNING_MESSAGE: 'You should replace them if you are using biweekly lenses.',
            NEVER_USE_MESSAGE: 'You\'ve not tracked your usage yet.'
        },
    },
};

const handlers = {
    'LaunchRequest': function () {
        this.emit('AMAZON.HelpIntent');
    },
    'SinceIntent': function () {
        var that = this;
        var reference = this.handler.userId.replace(/\[|\.|\]/g, "_");
        database.ref('/users/' + reference).once('value').then(function(snapshot){
          var last = snapshot.val();
          if(last === null){
            that.emit(':tell', that.t('NEVER_USE_MESSAGE'));
          }else{
            var now = moment(moment().format("YYYYMMDD"));
            var then = moment(last['moment']);
            var days = now.diff(then, 'days');
            var weeks = now.diff(then, 'weeks');
            var use_week = (days % 7 == 0) && (days != 0);
            days = (days != 1) ? days + ' days' : days + ' day';
            weeks = (weeks != 1) ? weeks + ' weeks' : weeks + ' week';
            var htime = (use_week) ? weeks : days;
            var human_date = then.format("dddd, MMMM Do")

            var message = that.t('SINCE_MESSAGE').replace('$htime', htime).replace('$date', human_date);
            if (days >= 14) message += that.t('WARNING_MESSAGE');
            console.log(message)
            that.emit(':tell', message);
          }
        });
    },
    'ResetIntent': function () {
        var reference = this.handler.userId.replace(/\[|\.|\]/g, "_");
        database.ref('users/' + reference).set({
          'moment': moment().format("YYYYMMDD")
        });
        this.emit(':tell', this.t('RESET_MESSAGE'));
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
    alexa.userId =  event.session.user.userId
    // To enable string internationalization (i18n) features, set a resources object.
    alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);
    alexa.execute();
};
