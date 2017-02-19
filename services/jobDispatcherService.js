/**
 * Desc: This file contains backbone function of this whole 'CRON-JOBS' project
 *       Its a job dispatcher who dispatches a new job given proper job-context
 */

var async = require('async'),
        _ = require('lodash');


var wait = function(waitTime, done){
    setTimeout(
        done,               
        waitTime      
    );
}

var dispatchJob = function(jobContext, args){
    console.log("STARTING " + jobContext.name + " ....... ");
    var firstIteration = true;
    async.forever(  //The first function keeps on calling itself again n again
      function(next){
          async.waterfall([
               function(callback){
                  var augmentedArgs = _.clone(args, true);
                  augmentedArgs.push(callback);
                  jobContext.doWork.apply(jobContext, augmentedArgs);
               }
            ],
            function(err, result){
               if(err){
                  next(err);
               }
               else{
                  console.log(jobContext.name + " is going to sleep....");
                  wait(jobContext.frequency, next);
               }
            }
          )
      },

      function(err){  //This will be called when an error is passed as first argument in function 'next' 
          if(err){
             console.log("Stopping " + jobContext.name + ". Due to error:=> " + JSON.stringify(err));
          }
      }
    );  
}

module.exports.dispatchJob = dispatchJob;