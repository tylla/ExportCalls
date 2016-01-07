/*jslint node: true, sloppy: true */
/*global Future, log, finishAssistant_global, logSubscription, startAssistant, logToApp, PalmCall, DB, fs */

var doExportAssitant = function (future) {
};

doExportAssitant.prototype.createHeadingLine = function () {
	var line = "Type\tDate/Time\tDuration [s]\tFrom\tService\tTo\tName(s)\tService(s)\r\n";
	return line;
};

doExportAssitant.prototype.convertEntryToLine = function (e) {
	var line = "", i, text;
	line += (e.type || " ") + "\t";
	line += (new Date(e.timestamp).toISOString() || " ") + "\t";
//	line += (Math.round(e.duration / 1000) || "0") + "\t";
	line += (e.duration / 1000 || "0") + "\t";
	line += (e.from.addr || " ") + "\t";
	line += (e.from.service || " ") + "\t";
	for (var j=0; j<e.to.length; j++) {
		line += e.to[j].addr + "\t";
		line += e.to[j].name + "\t";
		line += e.to[j].service + "\t";
	}
	line += text + "\r\n";
	return line;
};

doExportAssitant.prototype.run = function (outerFuture, subscription) {
	log("============== doExportAssistant");
	var initializeCallback, databaseCallback, finishAssistant, args = this.controller.args, stats = { calls: 0, written: 0, count: 0, fileSize: 0 },
		config = args, fileStream, query = {};
	log("args: " + JSON.stringify(args));
	finishAssistant = function (result) {
		finishAssistant_global({outerFuture: outerFuture, result: result});
		logSubscription = undefined; //delete subscription.
	};
	log("Future: " + JSON.stringify(outerFuture.result));
	
	if (!startAssistant({outerFuture: outerFuture, run: this.run.bind(this) })) {
		delete outerFuture.result;
		if (subscription) {
			logSubscription = subscription; //cool, seems to work. :)
			logToApp("Export already running, connecting output to app.");
		}
		return;
	}
	
	databaseCallback = function (future) {
		try {
			var r = future.result, i, line, fileStats;
			if (r.returnValue === true) {
				for (i = 0; i < r.results.length; i += 1) {
					line = this.convertEntryToLine(r.results[i]);
					stats.calls += 1;
					fileStream.write(line);
				}
				//only the first count tells me how many calls there are... 
				if (!stats.count) {
					stats.count = r.count;
				}
				logToApp("Exported\t" + stats.calls + " / " + stats.count);
	
				//if there are more, call find again.
				if (stats.calls !== r.count && r.results.length && r.next) {
					query.page = r.next;
					DB.find(query, false, true).then(this, databaseCallback);
				} else {
					//we are finished. give back control to app.
					fileStream.end();
					fileStats = fs.statSync("/media/internal/" + config.filename);
					stats.fileSize = fileStats.size;
					log("Success, returning to client");
					finishAssistant({ finalResult: true, success: true, reason: "All went well", stats: stats});
				}
			} else {
				log("Got database error:" + JSON.stringify(r));
				finishAssistant({ finalResult: true, success: false, reason: "Database Failure: " + r.errorCode + " = " + r.errorText});
			}
		} catch (e) {
			log("Got database error:" + JSON.stringify(e));
			finishAssistant({
				finalResult: true,
				success: false,
				reason: "Database Failure: " + (e ? e.name : "undefined") + " = " + (e ? e.message : "undefined")
			});
		}
	};
	
	logSubscription = subscription;
	if (!config.filename) {
		config.filename = "calls.txt";
	}
	fileStream = fs.createWriteStream("/media/internal/" + config.filename, {flags: "w"});
	fileStream.write(this.createHeadingLine());
	query.from = "com.palm.phonecall:1";
	query.limit = 10;
	query.incDel = false;
	log("Calling DB.find for the first time.");
	DB.find(query, false, true).then(this, databaseCallback);
	
	return outerFuture;
};
