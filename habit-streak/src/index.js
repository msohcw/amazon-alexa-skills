'use strict';

const Alexa = require('alexa-sdk');
const request = require('request');
const firebase = require('firebase');
var moment = require('moment');

var config = {
  apiKey: "*** REMOVED ***",
  authDomain: "habit-streak-faaa3.firebaseapp.com",
  databaseURL: "https://habit-streak-faaa3.firebaseio.com",
  projectId: "habit-streak-faaa3",
  storageBucket: "habit-streak-faaa3.appspot.com",
  messagingSenderId: "16425995117"
};

firebase.initializeApp(config);

const database = firebase.database();

const APP_ID = undefined;  // TODO replace with your app ID (OPTIONAL).

const languageStrings = {
    'en': {
        translation: {
            SKILL_NAME: 'Habit Streak',
            HELP_MESSAGE: 'Build habits through better streaks. Say Did It to build your streak every day. Say Streak to get your current streak. Say Invert to invert the streak, so that your streak grows automatically but Did It breaks your streak.',
            STOP_MESSAGE: 'Goodbye!',
            INV_BUILD_STREAK: 'Okay. To build your streak every day, say Did It.',
            INV_BREAK_STREAK: 'Okay. To reset your streak, say Did It.',
            BREAK_STREAK: "Okay. Try again! Long streaks build strong habits.",
            BUILD_STREAK: "Good job! Keep building that streak and you'll have a strong habit in no time.",
            STREAK_MESSAGE: 'You\'ve kept up your streak for $htime. Keep going to build a strong habit!',
            LONG_MESSAGE: 'Your longest streak was for $htime.',
            START_MESSAGE: 'Let\'s get started building your streak today! Say Did It to build your streak.',
            TODAY_MESSAGE: 'You\'ve already completed your habit for today.'
        },
    },
};

const NEG = 'negative';
const POS = 'positive';
const DURATION = 'minutes';
const DT_FORMAT = 'X'

const handlers = {
    'LaunchRequest': function () {
        this.emit('AMAZON.HelpIntent');
    },
    'InvertIntent': function () {
        var that = this;
        var reference = this.handler.userId.replace(/\[|\.|\]/g, "_");
        database.ref('/users/' + reference).once('value').then(function(snapshot){
          var last = snapshot.val();
          if (last === null) {
            that.emit('Start')
          } else {
            var msg = (last['type'] == POS) ? that.t('INV_BREAK_STREAK'): that.t('INV_BUILD_STREAK');
            last['type'] = (last['type'] == POS) ? NEG : POS;
            if (last['type'] == POS) {
              last['count'] = 0;
              last['moment'] = moment().subtract({days: 10}).format(DT_FORMAT);
            } else {
              last['moment'] = moment().format(DT_FORMAT);
            }

            database.ref('users/' + reference).set(last);
            that.emit(":tell", msg);
          }
        });
    },
    'Start': function () {
        var reference = this.handler.userId.replace(/\[|\.|\]/g, "_");
        var initial = moment().subtract({days: 10}).format(DT_FORMAT);
        var clean = {
          'type': POS, 
          'moment': initial,
          'count': 0,
          'long': 0
        };
        database.ref('users/' + reference).set(clean);
        this.emit(':tell', this.t('START_MESSAGE'));
    },
    'StreakIntent': function () {
        var that = this;
        var reference = this.handler.userId.replace(/\[|\.|\]/g, "_");
        database.ref('/users/' + reference).once('value').then(function(snapshot){
          var last = snapshot.val();
          if(last === null){
            that.emit('Start');
          }else{
            var htime = 0;
            if (last['type'] == POS) {
              htime = last['count'];
            } else {
              var now = moment(moment().format(DT_FORMAT), DT_FORMAT);
              var then = moment(last['moment'], DT_FORMAT);
              htime = now.diff(then, DURATION);
            }
            last['long'] = Math.max(htime, last['long']);
            htime = (htime != 1) ? htime + ' days' : htime + ' day';
            database.ref('users/' + reference).set(last);
            that.emit(':tell', that.t('STREAK_MESSAGE').replace('$htime', htime));
          }
        });
    },
    'DoItIntent': function () {
        var that = this;
        var reference = this.handler.userId.replace(/\[|\.|\]/g, "_");
        database.ref('/users/' + reference).once('value').then(function(snapshot){
          var last = snapshot.val();
          var now = moment(moment().format(DT_FORMAT), DT_FORMAT);
          if(last === null){
            that.emit('Start');
          }else{
            var days = now.diff(moment(last['moment'], DT_FORMAT), DURATION);
            var msg = ""
            if (last['type'] == POS){
              if (days == 1) {
                last['count'] += 1;
                msg = that.t('BUILD_STREAK');
              } else if (days < 1) {
                that.emit(':tell', that.t('TODAY_MESSAGE'));
                return;
              } else {
                last['count'] = 1;
                msg = that.t('BUILD_STREAK');
              }
              last['long'] = Math.max(last['count'], last['long']);
            } else {
              last['long'] = Math.max(days, last['long']);
              msg = that.t('BREAK_STREAK');
            }
            last['moment'] = now.format(DT_FORMAT)
            database.ref('users/' + reference).set(last);
            that.emit(':tell', msg);
          }
        });
    },
    'LongIntent': function () {
        var that = this;
        var reference = this.handler.userId.replace(/\[|\.|\]/g, "_");
        database.ref('/users/' + reference).once('value').then(function(snapshot){
          var last = snapshot.val();
          var now = moment(moment().format(DT_FORMAT), DT_FORMAT);
          if(last === null){
            that.emit('Start');
          } else {
            var htime = last['long']; 
            htime = (htime != 1) ? htime + ' days' : htime + ' day';
            that.emit(':tell', that.t('LONG_MESSAGE').replace('$htime', htime));
          }
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
    alexa.userId =  event.session.user.userId
    // To enable string internationalization (i18n) features, set a resources object.
    alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);
    alexa.execute();
};
