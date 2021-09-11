import fetchScheduledApexJobs from '@salesforce/apex/OrgRefresherHelper.fetchScheduledApexJobs';

export function invokeFetchScheduledApexJobs(resolve, reject) {
    fetchScheduledApexJobs()
        .then(result => {
            resolve(result);
            /*
            let resultObj = JSON.parse(result);
            console.log('outside', resultObj);
            if (resultObj.isSuccess) {
                this.allApexJobs = [];
                console.log(resultObj);
                if (resultObj.returnValue['Scheduled Apex']) {
                    console.log('jobs exists');
                    resultObj.returnValue['Scheduled Apex'].forEach((item, index) => {
                        item.NextFireTime = new Date(item.NextFireTime);
                        item = { ...item, ...{ 'index': index } };
                        item = { ...item, ...{ 'status': 'init' } };
                        item = { ...item, ...{ 'checked': true } };
                        item = { ...item, ...{ 'msg': '' } };
                        Object.defineProperty(
                            item,
                            'isInit',
                            {
                                get: function () {
                                    return this.status == 'init';
                                }
                            }
                        );
                        Object.defineProperty(
                            item,
                            'isDone',
                            {
                                get: function () {
                                    return this.status == 'done';
                                }
                            }
                        );
                        Object.defineProperty(
                            item,
                            'isFailed',
                            {
                                get: function () {
                                    return this.status == 'failed';
                                }
                            }
                        );
                        this.allApexJobs.push(item);
                    });
                    console.log(this.allApexJobs);
                    this.DSAJLoading = false;
                }
                else {
                    //showErrorToast(this, "No Scheduled Apex Jobs found!");
                    this.errorDSAJ = "No Scheduled Apex Jobs found!";
                    this.DSAJLoading = false;
                }

                if (resultObj.returnValue['Reporting Snapshot']) {
                    console.log('jobs exists');
                    resultObj.returnValue['Reporting Snapshot'].forEach((item, index) => {
                        item.NextFireTime = new Date(item.NextFireTime);
                        item = { ...item, ...{ 'index': index } };
                        item = { ...item, ...{ 'status': 'init' } };
                        item = { ...item, ...{ 'checked': true } };
                        item = { ...item, ...{ 'msg': '' } };
                        Object.defineProperty(
                            item,
                            'isInit',
                            {
                                get: function () {
                                    return this.status == 'init';
                                }
                            }
                        );
                        Object.defineProperty(
                            item,
                            'isDone',
                            {
                                get: function () {
                                    return this.status == 'done';
                                }
                            }
                        );
                        Object.defineProperty(
                            item,
                            'isFailed',
                            {
                                get: function () {
                                    return this.status == 'failed';
                                }
                            }
                        );
                        this.allReportingJobs.push(item);
                    });
                    console.log(this.allReportingJobs);
                    this.DASLoading = false;
                }
                else {
                    //showErrorToast(this, "No Scheduled Apex Jobs found!");
                    this.errorDAS = "No Scheduled Reporting Snapshots found!";
                    this.DASLoading = false;
                }
            }
            else {
                this.DSAJLoading = false;
                this.DASLoading = false;
                this.errorDSAJ = resultObj.errorMsgs;
                this.errorDAS = resultObj.errorMsgs;
                //showErrorToast(this, resultObj.errorMsgs);
            }
            */
        })
        .catch(error => {
            reject(error);
            this.DSAJLoading = false;
            this.errorDSAJ = error;
            this.DASLoading = false;
            this.errorDAS = error;
            //showErrorToast(this, error);
        });
}