import { LightningElement, wire, api, track } from 'lwc';
import {CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import {reduceErrors} from 'c/ldsUtils';
export default class LwcUtility extends LightningElement {
    @track retUrl;
    parentRecordId;
    @wire(CurrentPageReference)
    findRetURL(pgRef){
        if(pgRef.state && pgRef.state.inContextOfRef)
        {
            let base64data = pgRef.state.inContextOfRef.substring(2);
            let retUrlAsStr = atob(base64data);
            this.retUrl = JSON.parse(retUrlAsStr);

            if(this.retUrl.attributes && this.retUrl.attributes.recordId)
            {
                this.parentRecordId = this.retUrl.attributes.recordId;
            }
        }
    }
    navigateToPgRef(pgRef, redirect)
    {
        this[NavigationMixin.Navigate](pgRef, redirect);
    }
    showSuccessToast(msg)
    {
        const evt = new ShowToastEvent({
            title: 'Success',
            message: msg,
            variant: 'success',
        });
        this.dispatchEvent(evt);
    }
    showErrorToastWithMsg(msg)
    {
        const evt = new ShowToastEvent({
            title: 'Error',
            message: msg,
            variant: 'error',
            mode: 'sticky'
        });
        this.dispatchEvent(evt);
    }
    showErrorToast(err)
    {
        const evt = new ShowToastEvent({
            title: 'Error',
            message: reduceErrors(err).join(', '),
            variant: 'error',
            mode: 'sticky'
        });
        this.dispatchEvent(evt);
    }
   
    /*
    {
        "message":"An error occurred while trying to update the record. Please try again.",
        "detail":"The Estimated Deal Close Date cannot be before today's date.",
        "output":{
            "errors":
            [
                {"constituentField":null,"duplicateRecordError":null,
                "errorCode":"FIELD_CUSTOM_VALIDATION_EXCEPTION","field":null,"fieldLabel":null,
                "message":"The Estimated Deal Close Date cannot be before today's date."}
            ],
            "fieldErrors":{}
        }
    }
    */
    findDisplayableErrorMessage(payload)
    {
        if(payload)
        {
            let errorMsg = '';
            for(let errIndex in payload.output.errors)
            {
                errorMsg += payload.output.errors[errIndex].message;
            }
            return errorMsg;
        }
    }
    isNullOrBlankOrZeroOrUndefined(val)
    {
        return val == null || val == '' || val == 0 || val == undefined;
    }
    connectedCallback()
    {
        console.log('base initialized');
    }
}