var jobDispatcher = require('./services/jobDispatcherService.js');
var config = require('./config.json');
var mongoose = require('mongoose');
mongoose.connect(config.mongoUrl);
require('./models/channel');
require('./models/video');

//**************************** JOB instances *******************************************//
var ytf = require('./jobs/YT_VIDEO_FETCH.js');
//**************************************************************************************//

//********************* Start jobs **************************//    
jobDispatcher.dispatchJob({
    name: "YT_VIDEO_FETCH",
    frequency: 100000,
    doWork: ytf.fetchChannels
}, []);

//************************************************************//