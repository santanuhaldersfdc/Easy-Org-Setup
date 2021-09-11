import { LightningElement, wire } from 'lwc';
import fetchOrgInformation from '@salesforce/apex/OrgRefresherHelper.fetchOrgInformation';
import fetchOutboundWorkflows from '@salesforce/apex/OrgRefresherHelper.fetchOutboundWorkflows';
import isOutboundWorkflow from '@salesforce/apex/OrgRefresherHelper.isOutboundWorkflow';
import deactivateWorkflows from '@salesforce/apex/OrgRefresherHelper.deactivateWorkflows';

import fetchScheduledApexJobs from '@salesforce/apex/OrgRefresherHelper.fetchScheduledApexJobs';

import fetchAllOutboundMsgs from '@salesforce/apex/OrgRefresherHelper.fetchAllOutboundMsgs';
import updateOutboundEndpoints from '@salesforce/apex/OrgRefresherHelper.updateOutboundEndpoints';
import fetchCustomSettingList from '@salesforce/apex/OrgRefresherHelper.fetchCustomSettingList';
import fetchCustomSettingMetadataAndData from '@salesforce/apex/OrgRefresherHelper.fetchCustomSettingMetadataAndData';
import updateCustomSettings from '@salesforce/apex/OrgRefresherHelper.updateCustomSettings';
import { showErrorToast, showErrorToastWithMsg } from 'c/lwcUtility';
import { invokeFetchScheduledApexJobs } from 'c/dataFetcher';
const screens = ['WELCOME', 'OUTBOUND', 'WORKFLOW', 'FIELDUPDATE'];
function Record() {
    this.Id = '';
    this.data = [];
    this.checked = false;
    this.status == '';
}
function FieldDetail() {
    this.api = '';
    this.type = '';
    this.value = '';
}
Record.prototype = {
    get isInit() {
        return this.status == 'init';
    },
    get isDone() {
        return this.status == 'done';
    },
    get isFailed() {
        return this.status == 'failed';
    },
}
FieldDetail.prototype = {
    get isText() {
        return this.type == 'STRING';
    },
    get isTextArea() {
        return this.type == 'TEXTAREA';
    },
    get isNumber() {
        return this.type == 'DOUBLE' || this.type == 'CURRENCY';
    },
    get isCheckbox() {
        return this.type == 'BOOLEAN';
    },
    get isDate() {
        return this.type == 'DATE';
    },
    get isDatetime() {
        return this.type == 'DATETIME';
    }
}
export default class OrgSetupHome extends LightningElement {

    //welcome screen variables
    orgName;
    orgURL;
    name;
    orgType;
    isSandbox;
    environment;
    //DSAJ start
    allApexJobs = [];
    errorDSAJ;
    DSAJData;
    //DSAJ end

    //DAS start
    allReportingJobs = [];
    errorDAS;
    get disableDAS() {
        let selectedItems = this.allReportingJobs.filter(item => {
            return item.checked;
        });
        return selectedItems.length == 0;
    }
    //DAS end

    //DOWF start
    allWorkflowRules = [];
    filteredWorkflowRules = [];
    workflowsSelected = [];
    wfFilterTimer;
    wfChainingIndex = -1;
    wfFilterIndex = -1;
    wfProcessed = 0;
    errorDOWF;

    get disableDeactivateWorkflows() {
        let selectedItems = this.filteredWorkflowRules.filter(item => {
            return item.checked;
        });
        return selectedItems.length == 0;
    }

    //DOWF end

    //UOWF start
    allOutboundMsgs = [];
    outboundsSelected = [];
    chainingIndex = -1;
    outboundProcessed = 0;
    intervalTimer;
    errorUOWF;
    get disableUpdateEndpoints() {
        let selectedItems = this.allOutboundMsgs.filter(item => {
            return item.checked;
        });
        return this.allOutboundMsgs.length == 0 || selectedItems.length == 0;
    }
    //UOWF end

    //OCS start
    customSettingOptions = [];
    selectedCS;
    fieldsApiToDetails = [];
    customSettingRecordList = [];



    get showAsTable() {
        return this.customSettingHeaders.length < 5;
    }
    get customSettingHeaders() {
        return this.fieldsApiToDetails.map(item => { return { 'api': item.api, 'label': item.Label } })
    }
    get recordsAsList() {
        let rows = this.customSettingRecordList.map(item => {
            let row = new Record();
            row.Id = item.Id;
            row.data = [];
            row.checked = item.checked;
            row.status = item.status;
            row.msg = item.msg;
            let fieldValues = this.fieldsApiToDetails.map(field => {
                let eachFieldValue = new FieldDetail();
                eachFieldValue.api = field.api;
                eachFieldValue.value = item[field.api];
                eachFieldValue.type = field.Type;
                return eachFieldValue;
            });
            row.data = fieldValues;
            return row;
        });
        console.log('rows', rows);
        return rows;
    }
    get disableUpdateCS() {
        let selectedItems = this.customSettingRecordList.filter(item => {
            return item.checked;
        });
        return this.customSettingRecordList.length == 0 || selectedItems.length == 0;
    }

    //OCS end

    //loaders
    welcomeLoading = true;
    currentScreen = 'WELCOME';
    currentOperation;
    showModal;

    DSAJLoading = false;
    DASLoading = false;
    DOWFLoading = false;
    UOWFLoading = false;
    OCSLoading = false;

    showProgressDOWF = false;
    showProgressUOWF = false;

    get showWelcomeScreen() {
        return this.currentScreen == 'WELCOME';
    }
    get showDSAJScreen() {
        return this.currentScreen == 'DSAJ';
    }
    get showDASScreen() {
        return this.currentScreen == 'DAS';
    }
    get showDOWFScreen() {
        return this.currentScreen == 'DOWF';
    }
    get showUOWFScreen() {
        return this.currentScreen == 'UOWF';
    }
    get showOCSScreen() {
        return this.currentScreen == 'OCS';
    }

    //common variables or getters - start
    get currentSectionHeader() {
        switch (this.currentScreen) {
            case 'DSAJ':
                return 'Disable Scheduled Apex Jobs';
            case 'DOWF':
                return 'Disable Outbound Workflows';
            case 'UOWF':
                return 'Update Outbound Endpoints';
            case 'OCS':
                return 'Overwrite Custom Settings';
            default:
                return 'Welcome';
        }
    }
    get isLoading() {
        return false;//this.welcomeLoading || this.DASLoading || this.DSAJLoading || this.DOWFLoading || this.UOWFLoading || this.OCSLoading;
    }
    get isProcessing() {
        return (this.showDOWFScreen && this.showProgressDOWF)
            || (this.showUOWFScreen && this.showProgressUOWF);
    }
    get progress() {
        switch (this.currentOperation) {
            case 'OUTBOUNDUPDATE':
                {
                    return this.outboundProcessed * 100 / this.outboundsSelected.length;
                }
            case 'WORKFLOWFILTERING':
                {
                    return this.wfProcessed * 100 / this.allWorkflowRules.length;
                }
            case 'WORKFLOWDEACTIVATING':
                {
                    return this.wfProcessed * 100 / this.workflowsSelected.length;
                }
            case 'FIELDUPDATEFILTERING':
                {
                    return this.fuProcessed * 100 / this.allFieldUpdates.length;
                }
            case 'FIELDUPDATEMASKING':
                {
                    return this.fuProcessed * 100 / this.fieldUpdatesSelected.length;
                }
            default:
                return 0;
        }
    }
    get getTrue() {
        return true;
    }
    get getFalse() {
        return false;
    }
    get modalClass() {
        switch (this.currentScreen) {
            case 'OCS':
                return 'slds-modal__container widestModal';
            default:
                return 'slds-modal__container widerModal';
        }
    }
    //common variables or getters - end


    //navigate
    navigateToScreen(e) {
        console.log(e.target.getAttribute('data-id'));

        let selectedoption = e.target.getAttribute('data-id');
        switch (selectedoption) {
            case 'DSAJ':
                {
                    console.log('current screen DSAJ');
                    this.currentScreen = 'DSAJ';
                    this.showModal = true;

                    if (this.DSAJData) {
                        this.initDataToChild(this.DSAJData, 'c-disable-scheduled-apex-jobs');
                    }
                    if (this.errorDSAJ) {
                        this.initErrorToChild(this.errorDSAJ, 'c-disable-scheduled-apex-jobs');
                    }
                    break;
                }
            case 'DAS':
                {
                    console.log('current screen DAS');
                    this.currentScreen = 'DAS'
                    this.showModal = true;
                    if (!this.DASLoading) {
                        if (this.errorDAS) {
                            showErrorToastWithMsg(this, this.errorDAS);
                        }
                    }
                    break;
                }
            case 'DOWF':
                {
                    this.currentScreen = 'DOWF';
                    this.showModal = true;
                    if (!this.DOWFLoading) {
                        if (this.errorDOWF) {
                            showErrorToastWithMsg(this, this.errorDOWF);
                        }
                    }
                    break;
                }
            case 'UOWF':
                {
                    this.currentScreen = 'UOWF';
                    this.showModal = true;
                    if (!this.UOWFLoading) {
                        if (this.errorUOWF) {
                            showErrorToastWithMsg(this, this.errorUOWF);
                        }
                    }
                    break;
                }
            case 'OCS':
                {
                    this.currentScreen = 'OCS';
                    this.showModal = true;
                    if (!this.OCSLoading) {
                        if (this.errorOCS) {
                            showErrorToastWithMsg(this, this.errorOCS);
                        }
                    }
                    break;
                }
            case 'SED':
                {
                    this.currentScreen = 'SED';
                    window.open('/lightning/setup/OrgEmailSettings/home');
                    break;
                }
            default:
                {

                }
        }

    }

    initErrorToChild(error, compName) {
        setTimeout(() => {
            let child = this.template.querySelector(compName);
            if (child) {
                child.initiateError(error);
            }
        }, 100);
    }

    initDataToChild(data, compName) {
        setTimeout(() => {
            let child = this.template.querySelector(compName);
            if (child) {
                child.initiateData(data);
            }
        }, 100);
    }


    //DAS FUNCTIONS - START
    disableReportingJobs() {
        let selectedItems = this.allReportingJobs.filter(item => {
            return item.checked;
        });
        console.log('selectedItems', selectedItems);
        let selectedCronIds = selectedItems.map(item => {
            return item.Id;
        })
        if (selectedItems) {
            disableApexJobs({ "cronIdsAsString": JSON.stringify(selectedCronIds) })
                .then(result => {
                    console.log(result);
                    //"{\"successMsg\":null,\"returnValue\":{\"08e2i00000BNxwpAAD\":{\"isSuccess\":true}},\"isSuccess\":true,\"errorMsgs\":null}"
                    let resultObj = JSON.parse(result);
                    console.log(resultObj);
                    if (resultObj.isSuccess) {
                        if (resultObj.returnValue) {
                            for (const [key, value] of Object.entries(resultObj.returnValue)) {
                                console.log(key, value);
                                this.allReportingJobs = this.allReportingJobs.map(item => {
                                    if (item.Id == key) {
                                        item.status = value.isSuccess ? 'done' : 'failed';
                                        item.msg = value.isSuccess ? '' : value.errorMsg;
                                    }
                                    return item;
                                });
                            }
                        }
                    }
                    else {
                        showErrorToast(this, resultObj.errorMsgs);
                    }
                })
                .catch(error => {
                    console.log(JSON.stringify(error));
                    showErrorToast(this, error);
                });
        }
    }
    //DAS FUNCTIONS - END

    //DOWF functions- start
    filterWorkflows() {
        this.currentOperation = 'WORKFLOWFILTERING';
        this.showProgressDOWF = true;
        this.wfFilterTimer = setInterval(() => { this.wfChainingIndex++; this.isOutboundWorkflow(this.wfChainingIndex); }, 200);
    }
    async isOutboundWorkflow(index) {
        console.log(index);
        if (index == this.allWorkflowRules.length) {
            clearInterval(this.wfFilterTimer);
            this.wfFilterIndex = -1;
            this.wfChainingIndex = -1;
            this.workflowUpdateLoading = false;
            return;
        }
        let result = await isOutboundWorkflow({ "wfId": this.allWorkflowRules[index].Id });
        console.log(result);
        let resultObj = JSON.parse(result);
        if (resultObj.isSuccess) {
            let actions = resultObj.returnValue.workflow.Metadata.actions;
            let hasOutbound = false;
            actions.forEach((item) => {
                if (item.type == "OutboundMessage") {
                    hasOutbound = true;
                }
            });
            if (hasOutbound) {
                let item = {};
                item = { ...item, ...this.allWorkflowRules[index] };
                item = { ...item, ...{ 'active': resultObj.returnValue.workflow.Metadata.active } };
                item = { ...item, ...{ 'workflow': resultObj.returnValue.workflow } };
                item = { ...item, ...{ 'status': 'init' } };
                item = { ...item, ...{ 'index': ++this.wfFilterIndex } };
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
                this.filteredWorkflowRules = [...this.filteredWorkflowRules, item];
            }
        }
        else {
            let mainIndex = this.allWorkflowRules[index].index;
            this.allWorkflowRules[mainIndex].status = 'failed';
            this.allWorkflowRules[mainIndex].msg = resultObj.errorMsgs.join(',');
            this.filteredWorkflowRules = [...this.filteredWorkflowRules, ...this.allWorkflowRules[mainIndex]];
        }
        if (++this.wfProcessed == this.allWorkflowRules.length) {
            this.showProgressDOWF = false;
            this.currentOperation = null;
            this.wfProcessed = 0;
        }
    }
    deactivateWorkflows() {
        console.log(this.filteredWorkflowRules);
        this.wfChainingIndex = -1;
        //purposefully slow to track each update
        this.workflowsSelected = this.filteredWorkflowRules.filter(item => {
            return item.checked;
        });
        console.log('workflowsSelected', this.workflowsSelected.length);
        this.showProgressDOWF = true;
        this.currentOperation = 'WORKFLOWDEACTIVATING';

        this.wfFilterTimer = setInterval(() => {
            this.wfChainingIndex++;
            this.deactivateOneWorkflow(this.wfChainingIndex);
        }, 500);
    }

    async deactivateOneWorkflow(index) {
        if (index == this.workflowsSelected.length) {
            clearInterval(this.wfFilterTimer);
            this.workflowUpdateLoading = false;
            this.wfChainingIndex = -1;
            return;
        }
        console.log('current', JSON.stringify(this.workflowsSelected[index]));
        let result = await deactivateWorkflows({ "workflowJSON": JSON.stringify(this.workflowsSelected[index].workflow), "wfId": this.workflowsSelected[index].Id });
        console.log('result', result);
        let resultObj = JSON.parse(result);
        if (resultObj.isSuccess) {
            let mainIndex = this.workflowsSelected[index].index;
            this.filteredWorkflowRules[mainIndex].status = 'done';
            this.filteredWorkflowRules[mainIndex].checked = false;
            this.filteredWorkflowRules[mainIndex].active = false;
            this.filteredWorkflowRules = [...this.filteredWorkflowRules];
        }
        else {
            let mainIndex = this.workflowsSelected[index].index;
            this.filteredWorkflowRules[mainIndex].status = 'failed';
            this.filteredWorkflowRules[mainIndex].msg = resultObj.errorMsgs.join(',');
            this.filteredWorkflowRules[mainIndex].checked = false;
            this.filteredWorkflowRules = [...this.filteredWorkflowRules];
        }
        if (++this.wfProcessed == this.workflowsSelected.length) {
            this.wfProcessed = 0;
            this.showProgressDOWF = false;
            this.currentOperation = null;
        }
    }
    //DOWF functions- end

    //UOWF start
    handleEndpointChange(e) {
        console.log(e.target.value);
        console.log(e.target.getAttribute('data-id'));//index
        let index = e.target.getAttribute('data-id');
        this.allOutboundMsgs[index].endpointURL = e.target.value;
    }
    updateEndpoints() {
        console.log(this.allOutboundMsgs);

        //purposefully slow to track each update
        this.outboundsSelected = this.allOutboundMsgs.filter(item => {
            return item.checked;
        });
        this.showProgressUOWF = true;
        this.currentOperation = 'OUTBOUNDUPDATE';
        this.intervalTimer = setInterval(() => {
            this.chainingIndex++;
            this.updateOutboundEndpointForOne(this.chainingIndex);
        }, 500);

    }

    async updateOutboundEndpointForOne(index) {
        console.log(index, new Date());
        if (index == this.outboundsSelected.length) {
            clearInterval(this.intervalTimer);
            this.showProgressUOWF = false;
            this.chainingIndex = -1;
            return;
        }
        let result = await updateOutboundEndpoints({ "obId": this.outboundsSelected[index].Id, "endpointUrl": this.outboundsSelected[index].endpointURL });
        console.log('result', result);
        let resultObj = JSON.parse(result);
        if (resultObj.isSuccess) {
            let mainIndex = this.outboundsSelected[index].index;
            this.allOutboundMsgs[mainIndex].status = 'done';
            this.allOutboundMsgs[mainIndex].checked = false;
            this.allOutboundMsgs = [...this.allOutboundMsgs];
        }
        else {
            let mainIndex = this.outboundsSelected[index].index;
            this.allOutboundMsgs[mainIndex].status = 'failed';
            this.allOutboundMsgs[mainIndex].msg = resultObj.errorMsgs.join(',');
            this.allOutboundMsgs[mainIndex].checked = false;
            this.allOutboundMsgs = [...this.allOutboundMsgs];
        }
        if (++this.outboundProcessed == this.outboundsSelected.length) {
            this.showProgressUOWF = false;
            this.currentOperation = null;
            this.outboundProcessed = 0;
        }
    }
    //UOWF end

    //OCS start
    handleCSChange(e) {
        this.selectedCS = e.detail.value;
        console.log(this.selectedCS);
        this.OCSLoading = true;
        fetchCustomSettingMetadataAndData({ 'csName': this.selectedCS })
            .then(result => {
                console.log(JSON.parse(result));
                let resultObj = JSON.parse(result);
                if (resultObj.isSuccess) {
                    if (resultObj.returnValue) {
                        console.log(resultObj.returnValue.fieldsApiToDetails);
                        this.fieldsApiToDetails = resultObj.returnValue.fieldsApiToDetails;
                        this.customSettingRecordList = resultObj.returnValue.recordList.map(item => {
                            item.status = 'init';
                            return item;
                        });
                    }
                }
                this.OCSLoading = false;
            })
            .catch(error => {
                console.log(error);
                this.OCSLoading = false;
                showErrorToast(this, error);
            });
    }
    //TODO: check the field value change and revert the selection checkbox if change is reverted
    handleCSFieldValueChange(e) {
        console.log(e.target.getAttribute('data-id'));//index
        console.log(e.target.getAttribute('data-var'));//field
        let value;
        switch (e.target.type) {
            case 'checkbox': {
                value = e.target.checked;
                break;
            }
            default: {
                value = e.target.value;
            }
        }
        console.log(value);//value
        let index = e.target.getAttribute('data-id');
        let fieldName = e.target.getAttribute('data-var');
        this.customSettingRecordList[index][fieldName] = value;
        this.customSettingRecordList[index]['checked'] = true;
        //TODO: check for change-revert and make checked=false
        this.customSettingRecordList = [...this.customSettingRecordList];
    }
    updateCustomSettings() {
        this.OCSLoading = true;
        let selectedItems = this.customSettingRecordList.filter(item => {
            return item.checked;
        });
        updateCustomSettings({ 'selectedCSListJSON': JSON.stringify(selectedItems), 'csName': this.selectedCS })
            .then(result => {
                let resultObj = JSON.parse(result);
                console.log(resultObj);
                if (resultObj.isSuccess) {
                    resultObj.returnValue.successResults.forEach(item => {
                        this.customSettingRecordList = this.customSettingRecordList.map(mainItem => {
                            if (mainItem.Id == item.Id) {
                                item.isSuccess ? item.status = 'done' : item.status = 'failed';
                                return item;
                            }
                            return mainItem;
                        });
                    });
                    this.OCSLoading = false;
                }
                else {
                    this.OCSLoading = false;
                    showErrorToast(this, resultObj.errorMsgs);
                }
            })
            .catch(error => {
                console.log(error);
                this.OCSLoading = false;
                showErrorToast(this, error);
            });
    }
    //OCS end

    connectedCallback() {
        console.log('connected callback called');
        //DSAJ
        //DAS
        this.DSAJLoading = true;
        this.DASLoading = true;

        let DSAJpromise = new Promise((resolve, reject) => {
            invokeFetchScheduledApexJobs(resolve, reject);
        });
        DSAJpromise.then((data) => {
            //if DSAJ loaded, pass it
            //else store it for later
            console.log('resolved');
            if (this.showDSAJScreen) {
                console.log('showDSAJScreen');
                let DSAJScreen = this.template.querySelector('c-disable-scheduled-apex-jobs');
                console.log('dsaj', DSAJScreen);
                if (DSAJScreen) {
                    DSAJScreen.initiateData(data);
                }
            }
            else {
                this.DSAJData = data;
            }
        }).catch((error) => {
            //if DSAJ loaded, pass it
            //else store it for later
            console.log('error', error);
            if (this.showDSAJScreen) {
                let DSAJScreen = this.template.querySelector('c-disable-scheduled-apex-jobs');
                if (DSAJScreen) {
                    DSAJScreen.initiateError(error);
                }
            }
            else {
                this.errorDSAJ = error;
            }
        });
        /*
         this.DOWFLoading = true;
         fetchOutboundWorkflows()
             .then(result => {
                 let resultObj = JSON.parse(result);
                 if (resultObj.isSuccess) {
                     this.allWorkflowRules = [];
                     this.workflowsSelected = [];
                     resultObj.returnValue.workflows.forEach((item, index) => {
                         item = { ...item, ...{ 'index': index } };
                         this.allWorkflowRules.push(item);
                     });
                     this.DOWFLoading = false;
                     setTimeout(() => { this.filterWorkflows(); }, 10);
                 }
                 else {
                     this.DOWFLoading = false;
                     this.errorDOWF = resultObj.errorMsgs;
                 }
             })
             .catch(error => {
                 this.DOWFLoading = false;
                 this.errorDOWF = error;
             });
         */
        /*
        this.UOWFLoading = true;
        fetchAllOutboundMsgs()
            .then(result => {
                console.log('result', result);
                let resultObj = JSON.parse(result);
                if (resultObj.isSuccess) {
                    this.allOutboundMsgs = [];
                    this.outboundsSelected = [];
                    //TODO: Show original URL & object name
                    resultObj.returnValue.outboundgMsgs.forEach((item, index) => {
                        item = { ...item, ...{ 'endpointURL': 'www.test.com' } };
                        item = { ...item, ...{ 'status': 'init' } };
                        item = { ...item, ...{ 'index': index } };
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
                        this.allOutboundMsgs.push(item);
                    });
                    this.UOWFLoading = false;
                }
                else {
                    this.UOWFLoading = false;
                    this.errorUOWF = resultObj.errorMsgs;
                }
            })
            .catch(error => {
                console.log('error', error);
                this.UOWFLoading = false;
                this.errorUOWF = error;
            });
        */
        this.OCSLoading = true;
        fetchCustomSettingList()
            .then(result => {
                let resultObj = JSON.parse(result);
                if (resultObj.isSuccess) {
                    if (resultObj.returnValue && resultObj.returnValue.csList) {
                        this.customSettingOptions = [];
                        for (const [api, label] of Object.entries(resultObj.returnValue.csList)) {
                            this.customSettingOptions.push({ label: label + '[' + api + ']', value: api });
                        }
                    }
                }
                this.OCSLoading = false;
            })
            .catch(error => {
                console.log('error', error);
                this.OCSLoading = false;
            });
    }
    @wire(fetchOrgInformation)
    processOrgInfo({ error, data }) {
        if (data) {
            let result = JSON.parse(data);
            if (result.isSuccess) {
                this.orgName = result.returnValue.orgName;
                this.orgURL = result.returnValue.orgUrl;
                this.orgType = result.returnValue.orgType;
                this.isSandbox = result.returnValue.isSandbox;
                this.name = result.returnValue.name;
            }
            else {
                console.log(result);
                showErrorToast(this, result.errorMsgs);
            }
        }
        else if (error) {
            console.log(error);
            showErrorToast(this, error);
        }
        this.welcomeLoading = false;
    }
    selectAllToggle(e) {
        switch (this.currentScreen) {
            case 'DSAJ':
                {
                    this.allApexJobs = this.allApexJobs.map(item => {
                        item.checked = e.target.checked;
                        return item;
                    });
                    break;
                }
            case 'DOWF':
                {
                    this.filteredWorkflowRules = this.filteredWorkflowRules.map(item => {
                        item.checked = e.target.checked;
                        return item;
                    });
                    break;
                }
            case 'UOWF':
                {
                    this.allOutboundMsgs = this.allOutboundMsgs.map(item => {
                        item.checked = e.target.checked;
                        return item;
                    });
                    break;
                }
            case 'OCS':
                {
                    this.customSettingRecordList = this.customSettingRecordList.map(item => {
                        item.checked = e.target.checked;
                        return item;
                    });
                    break;
                }
            default:
                {

                }
        }

    }
    handleSelectionChange(e) {
        let index = e.target.getAttribute('data-id');
        switch (this.currentScreen) {

            case 'DOWF':
                {
                    this.filteredWorkflowRules[index].checked = e.target.checked;
                    this.filteredWorkflowRules = [...this.filteredWorkflowRules];
                    break;
                }
            case 'UOWF':
                {
                    this.allOutboundMsgs[index].checked = e.target.checked;
                    this.allOutboundMsgs = [...this.allOutboundMsgs];
                    console.log(this.allOutboundMsgs);
                    break;
                }
            case 'OCS':
                {
                    this.customSettingRecordList[index].checked = e.target.checked;
                    this.customSettingRecordList = [...this.customSettingRecordList];
                    console.log(this.customSettingRecordList);
                    break;
                }
            default:
                {

                }
        }

    }
    handleToggleLoading(e) {
        let det = e.detail;
        this[det.Loader] = det.value;
    }
    cancel() {
        this.showModal = false;
        this.currentScreen = '';
    }
}