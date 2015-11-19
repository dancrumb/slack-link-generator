(function () {
    "use strict";
    var express = require("express");
    var async   = require("async");
    var _ = require("lodash");

    var log4js = require("log4js");
    var logger = log4js.getLogger();
    var app = express();
    var commandToken;


    if(process.env.SLACK_TOKEN) {
        var SlackClient = require("slack-api-client");
        var client = new SlackClient(process.env.SLACK_TOKEN);
    } else {
        logger.fatal("No SLACK_TOKEN set, so cannot proceed");
        process.exit(-1);
    }
    if(process.env.COMMAND_TOKEN) {
        commandToken =  process.env.COMMAND_TOKEN;
    } else {
        logger.fatal("No COMMAND_TOKEN set, so cannot proceed");
        process.exit(-1);
    }

    var getTeamId = function (cb) {
        client.api.team.info(function (err, res) {
            if(err) {
                cb(err);
            } else {
                cb(null, res.team.id);
            }
        });
    };

    var getChannelId = function(channelName, cb) {
        client.api.channels.list({}, function (err, res) {
            if(err) {
                cb(err);
            } else {
                var channelId = _.result(_.find(res.channels, { "name": channelName}), "id");
                return cb(null, channelId);
            }
        });
    };

    app.use(log4js.connectLogger(logger, { level: log4js.levels.INFO }));

    app.get("/api/slackLink/bot", function (req, res) {
        logger.info("Requesting link from bot");
        if(req.query.token !== commandToken) {
            return res.status(400).send("Invalid token");
        }
        else {
            res.send("slack://channel?team="+req.query.team_id+"&id="+req.query.channel_id);
        }
    });

    app.get("/api/slackLink/:channel", function (req, res) {
        logger.info("Requesting a link for the #%s channel", req.params.channel);
        async.parallel({
            team: getTeamId,
            channel: _.partial(getChannelId,req.params.channel)
        }, function (err, data) {
            if(err) {
                res.status(500).send(err);
            } else {
                if(!data.channel) {
                    res.status(404).send("Channel '#"+req.params.channel+"' not found" );
                } else {
                    res.send("slack://channel?team="+data.team+"&id="+data.channel);
                }
            }
        });

    });



    var server = app.listen(3000, function () {
        var host = server.address().address;
        var port = server.address().port;

        logger.info("Jellyvision Slack Link API listening at http://%s:%s", host, port);
    });

})();
