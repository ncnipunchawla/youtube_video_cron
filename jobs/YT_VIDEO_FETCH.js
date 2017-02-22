var _ = require('lodash'),
    async = require('async'),
    timestamp = require('internet-timestamp'),
    request = require('request'),
    config = require('./../config.json'),
	google = require('googleapis'),
	youtube = google.youtube('v3'),
	API_KEY = 'AIzaSyC5PcJLSPpMApI98bxio159s1UsR1qOcQY';

var mongoose = require('mongoose');
var Channel = mongoose.model('Channel');
var Video = mongoose.model('Video');
var index = config.indexName;
var counter = 0;
var maxResults = 50;

var fetchChannels = function(callback) {
	var jobContext = this;
	Channel.find({}).exec(function(err, channels) {
		if (err) {
			console.log('ERROR IN FETCHING CHANNELS===>');
			callback(err);
		} else {
			var ytChannels = [];
			channels.forEach(function(channel){
        		channel.videoArray = [];
        		channel.nextPageToken = 0;
        		channel.nextLastSyncTime = new Date().getTime();
        		ytChannels.push(channel);
        	});
        	processChannels.apply(jobContext, [ytChannels, function(err){
        		if(err){
        			callback(err);
        		}
        		else{
        			console.log('DONEEEEEEE=============>');
        		}
        	}]);
		}
	})
}


var processChannels = function(ytChannels, finishCallback) {
	async.map(
		ytChannels, 

		function(ytchannel, callback) {
			if(ytchannel.nextPageToken === undefined){
				//nothing to pull from this ytchannel
				return callback();
			}
			var publishedAfter;
			var d = new Date();
			d.setDate(d.getDate() - 365);

			if (ytchannel.channel_lastSyncTime != null && ytchannel.channel_lastSyncTime != undefined) {
				publishedAfter = timestamp(new Date(ytchannel.channel_lastSyncTime));
			} 
			else {
				publishedAfter = timestamp(d);
			}
			
			var params = {
			    channelId: ytchannel.channelId,
			    part: 'snippet',
			    auth: API_KEY,
			    maxResults: maxResults,
			    type: 'video',
			    videoEmbeddable: true,
			    publishedAfter: publishedAfter
			}			

			if (ytchannel.nextPageToken != 0){
				params.pageToken = ytchannel.nextPageToken;
			}

			youtube.search.list(params, function(err, result){
			  	if (!err && result != null && result.items!=null && result.items!=undefined && result.items.length > 0){
			  		
			  		var videoArray = result.items;
				  	ytchannel.nextPageToken = result.nextPageToken;
				  	saveVideo(videoArray, ytchannel, function(err, res){
			  			if (err){
			  				ytchannel.nextPageToken = undefined;
					  	} 
					    callback();
			  		});
			  	} 

			  	//either there is an error or there are no more items to pull
			  	else { 
			  	   ytchannel.nextPageToken = undefined;
			  	   callback();
			  	}
			});
	    },

	    function(err, results) {
	    	if(err){
	    		console.log('error', err);
	    		finishCallback(err);
	    	}
	    	else{
	    		//check if all the channels for this batch finished processing (no more new videos for any of the yt-channels)
	    		if(ytChannels.filter(function(ytchannel){return ytchannel.nextPageToken!=undefined;}).length>0) {
	    			//Videos Still to be fetched
	    		    processChannels(ytChannels, finishCallback); 
	    		}
	    		else{
	    			//update the yt-channels 
	    			updateYtChannels(ytChannels, finishCallback);
	    		}
	    	}
	    }
	);
}

function saveVideo(videoArray, ytchannel, callback) {
	async.each(videoArray, function(video, next) {
		var insertObject = {
			videoId: video.id.videoId,
			channelName: ytchannel.channelName,
			videoDetails: video
		};
		var videoDb = new Video(insertObject);
		videoDb.save(function(err, res) {
			if (err) {
				console.log('ERR IN SAVING VIDEO=======>', err);
				next();
			} else {
				next();
			}
		})
	}, function(err, res) {
		if (err) {
			callback(err);
		} else {
			callback();
		}
	})
}

function updateYtChannels(ytChannels, finishCallback) {
	var channelNames = [];
	ytChannels.forEach(function(channel) {
		channelNames.push(channel.channelName);
	});
   	Channel.update({channelName: {$in: channelNames}}, {$set: {
   		channel_lastSyncTime: new Date().getTime()
   	}}, {multi: true}).exec(function(err, res) {
   		if (err) {
   			finishCallback(err);
   		} else {
   			finishCallback();
   		}
   	});
}

module.exports.fetchChannels = fetchChannels;
