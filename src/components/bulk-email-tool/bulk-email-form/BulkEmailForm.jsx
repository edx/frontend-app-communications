import React, { useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  Form, Icon, StatefulButton, Toast, useToggle,
} from '@edx/paragon';
import {
  SpinnerSimple, Cancel, Send, Event, Check,
} from '@edx/paragon/icons';
import { injectIntl, intlShape } from '@edx/frontend-platform/i18n';
import classNames from 'classnames';
import { getConfig } from '@edx/frontend-platform';
import TextEditor from '../text-editor/TextEditor';
import BulkEmailRecipient from './bulk-email-recipient';
import TaskAlertModal from '../task-alert-modal';
import useTimeout from '../../../utils/useTimeout';
import useMobileResponsive from '../../../utils/useMobileResponsive';
import ScheduleEmailForm from './ScheduleEmailForm';
import messages from './messages';
import { BulkEmailContext } from '../bulk-email-context';
import {
  addRecipient,
  clearEditor,
  clearErrorState,
  handleEditorChange,
  removeRecipient,
} from './data/actions';
import { editScheduledEmailThunk, postBulkEmailThunk } from './data/thunks';
import { getScheduledBulkEmailThunk } from '../bulk-email-task-manager/bulk-email-scheduled-emails-table/data/thunks';

import './bulkEmailForm.scss';

export const FORM_SUBMIT_STATES = {
  DEFAULT: 'default',
  PENDING: 'pending',
  COMPLETE: 'complete',
  COMPLETE_SCHEDULE: 'completed_schedule',
  SCHEDULE: 'schedule',
  RESCHEDULE: 'reschedule',
  ERROR: 'error',
};

const FORM_ACTIONS = {
  POST: 'POST',
  PATCH: 'PATCH',
};

function BulkEmailForm(props) {
  const { courseId, cohorts, intl } = props;
  const [{ editor }, dispatch] = useContext(BulkEmailContext);
  const [emailFormStatus, setEmailFormStatus] = useState(FORM_SUBMIT_STATES.DEFAULT);
  const [emailFormValidation, setEmailFormValidation] = useState({
    // set these as true on initialization, to prevent invalid messages from prematurely showing
    subject: true,
    body: true,
    recipients: true,
    schedule: true,
  });
  const [isTaskAlertOpen, openTaskAlert, closeTaskAlert] = useToggle(false);
  const [isScheduled, toggleScheduled] = useState(false);
  const isMobile = useMobileResponsive();

  /**
   * Since we are working with both an old and new API endpoint, the body for the POST
   * and the PATCH have different signatures. Therefore, based on the action required, we need to
   * format the data properly to be accepted on the back end.
   * @param {*} action "POST" or "PATCH" of the FORM_ACTIONS constant
   * @returns formatted Data
   */
  const formatDataForFormAction = (action) => {
    if (action === FORM_ACTIONS.POST) {
      const emailData = new FormData();
      emailData.append('action', 'send');
      emailData.append('send_to', JSON.stringify(editor.emailRecipients));
      emailData.append('subject', editor.emailSubject);
      emailData.append('message', editor.emailBody);
      if (isScheduled) {
        emailData.append('schedule', new Date(`${editor.scheduleDate} ${editor.scheduleTime}`).toISOString());
      }
      return emailData;
    }
    if (action === FORM_ACTIONS.PATCH) {
      return {
        email: {
          targets: editor.emailRecipients,
          subject: editor.emailSubject,
          message: editor.emailBody,
          id: editor.emailId,
        },
        schedule: isScheduled ? new Date(`${editor.scheduleDate} ${editor.scheduleTime}`).toISOString() : null,
      };
    }
    return {};
  };

  /**
   * This function resets the form based on what state the form is currently in. Used after
   * successfully sending or scheduling and email, or on error.
   *
   * @param {Boolean} error If true, resets just the state of the form, and not the editor.
   * if false, reset the form completely, and wipe all email data form the form.
   */
  const resetEmailForm = (error) => {
    if (error) {
      dispatch(clearErrorState());
    } else {
      dispatch(clearEditor());
    }
  };

  /**
   * Allows for a delayed form reset, to give the user time to process completion and error
   * states before reseting the form.
   */
  const delayedEmailFormReset = useTimeout(
    () => resetEmailForm(editor.errorRetrievingData),
    3000,
  );

  const onFormChange = (event) => dispatch(handleEditorChange(event.target.name, event.target.value));

  const onRecipientChange = (event) => {
    if (event.target.checked) {
      dispatch(addRecipient(event.target.value));
    } else {
      dispatch(removeRecipient(event.target.value));
    }
  };

  const validateDateTime = (date, time) => {
    if (isScheduled) {
      return !!date && !!time;
    }
    return true;
  };

  const validateEmailForm = () => {
    const subjectValid = editor.emailSubject.length !== 0;
    const bodyValid = editor.emailBody.length !== 0;
    const recipientsValid = editor.emailRecipients.length !== 0;
    const scheduleValid = validateDateTime(editor.scheduleDate, editor.scheduleTime);
    setEmailFormValidation({
      subject: subjectValid,
      recipients: recipientsValid,
      body: bodyValid,
      schedule: scheduleValid,
    });
    return subjectValid && bodyValid && recipientsValid && scheduleValid;
  };

  const createEmailTask = async () => {
    if (validateEmailForm()) {
      if (editor.editMode) {
        const editedEmail = formatDataForFormAction(FORM_ACTIONS.PATCH);
        dispatch(editScheduledEmailThunk(editedEmail, courseId, editor.schedulingId));
      } else {
        const emailData = formatDataForFormAction(FORM_ACTIONS.POST);
        dispatch(postBulkEmailThunk(emailData, courseId));
      }
      dispatch(getScheduledBulkEmailThunk(courseId, 1));
    }
  };

  /**
   * State manager for the various states the form can be in at any given time.
   * The states of the form are based off various pieces of the editor store, and
   * calculates what state and whether to reset the form based on these booleans.
   * Any time the form needs to change state, the conditions for that state change should
   * placed here to prevent unecessary rerenders and implicit/flakey state update batching.
   */
  useEffect(() => {
    if (editor.isLoading) {
      setEmailFormStatus(FORM_SUBMIT_STATES.PENDING);
      return;
    }
    if (editor.errorRetrievingData) {
      setEmailFormStatus(FORM_SUBMIT_STATES.ERROR);
      delayedEmailFormReset();
      return;
    }
    if (editor.formComplete) {
      if (isScheduled) {
        setEmailFormStatus(FORM_SUBMIT_STATES.COMPLETE_SCHEDULE);
      } else {
        setEmailFormStatus(FORM_SUBMIT_STATES.COMPLETE);
      }
      delayedEmailFormReset();
      return;
    }
    if (editor.editMode === true) {
      toggleScheduled(true);
      setEmailFormStatus(FORM_SUBMIT_STATES.RESCHEDULE);
    } else if (isScheduled) {
      setEmailFormStatus(FORM_SUBMIT_STATES.SCHEDULE);
    } else {
      setEmailFormStatus(FORM_SUBMIT_STATES.DEFAULT);
    }
  }, [isScheduled, editor.editMode, editor.isLoading, editor.errorRetrievingData, editor.formComplete]);

  const AlertMessage = () => (
    <>
      <p>{intl.formatMessage(messages.bulkEmailTaskAlertRecipients, { subject: editor.emailSubject })}</p>
      <ul className="list-unstyled">
        {editor.emailRecipients.map((group) => (
          <li key={group}>{group}</li>
        ))}
      </ul>
      {!isScheduled && (
        <p>
          <strong>{intl.formatMessage(messages.bulkEmailInstructionsCaution)}</strong>
          {intl.formatMessage(messages.bulkEmailInstructionsCautionMessage)}
        </p>
      )}
    </>
  );

  const EditMessage = () => (
    <>
      <p>
        {intl.formatMessage(messages.bulkEmailTaskAlertEditingDate, {
          dateTime: new Date(`${editor.scheduleDate} ${editor.scheduleTime}`).toLocaleString(),
        })}
      </p>
      <p>
        {intl.formatMessage(messages.bulkEmailTaskAlertEditingSubject, {
          subject: editor.emailSubject,
        })}
      </p>
      <p>{intl.formatMessage(messages.bulkEmailTaskAlertEditingTo)}</p>
      <ul className="list-unstyled">
        {editor.emailRecipients.map((group) => (
          <li key={group}>{group}</li>
        ))}
      </ul>
      <p>{intl.formatMessage(messages.bulkEmailTaskAlertEditingWarning)}</p>
      {!isScheduled && (
        <p>
          <strong>{intl.formatMessage(messages.bulkEmailInstructionsCaution)}</strong>
          {intl.formatMessage(messages.bulkEmailInstructionsCautionMessage)}
        </p>
      )}
    </>
  );

  return (
    <div className={classNames('w-100 m-auto', !isMobile && 'p-4 border border-primary-200')}>
      <TaskAlertModal
        isOpen={isTaskAlertOpen}
        alertMessage={editor.editMode ? EditMessage() : AlertMessage()}
        close={(event) => {
          closeTaskAlert();
          if (event.target.name === 'continue') {
            createEmailTask();
          }
        }}
      />
      <Form>
        <BulkEmailRecipient
          selectedGroups={editor.emailRecipients}
          handleCheckboxes={onRecipientChange}
          additionalCohorts={cohorts}
          isValid={emailFormValidation.recipients}
        />
        <Form.Group controlId="emailSubject">
          <Form.Label className="h3 text-primary-500">{intl.formatMessage(messages.bulkEmailSubjectLabel)}</Form.Label>
          <Form.Control name="emailSubject" className="w-lg-50" onChange={onFormChange} value={editor.emailSubject} />
          {!emailFormValidation.subject && (
            <Form.Control.Feedback className="px-3" hasIcon type="invalid">
              {intl.formatMessage(messages.bulkEmailFormSubjectError)}
            </Form.Control.Feedback>
          )}
        </Form.Group>
        <Form.Group controlId="emailBody">
          <Form.Label className="h3 text-primary-500">{intl.formatMessage(messages.bulkEmailBodyLabel)}</Form.Label>
          <TextEditor onChange={(value) => dispatch(handleEditorChange('emailBody', value))} value={editor.emailBody} />
          {!emailFormValidation.body && (
            <Form.Control.Feedback className="px-3" hasIcon type="invalid">
              {intl.formatMessage(messages.bulkEmailFormBodyError)}
            </Form.Control.Feedback>
          )}
        </Form.Group>
        <div>
          <p>{intl.formatMessage(messages.bulkEmailInstructionsProofreading)}</p>
        </div>
        <Form.Group>
          {getConfig().SCHEDULE_EMAIL_SECTION && (
            <div className="mb-3">
              <Form.Checkbox
                name="scheduleEmailBox"
                checked={isScheduled}
                onChange={() => toggleScheduled((prev) => !prev)}
                disabled={emailFormStatus === FORM_SUBMIT_STATES.PENDING}
              >
                {intl.formatMessage(messages.bulkEmailFormScheduleBox)}
              </Form.Checkbox>
            </div>
          )}
          {isScheduled && (
            <ScheduleEmailForm
              isValid={emailFormValidation.schedule}
              onDateTimeChange={onFormChange}
              dateTime={{ date: editor.scheduleDate, time: editor.scheduleTime }}
            />
          )}
          <div
            className={classNames('d-flex', {
              'mt-n4.5': !isScheduled && !isMobile,
              'flex-row-reverse align-items-end': !isMobile,
              'border-top pt-2': isScheduled,
            })}
          >
            {editor.editMode && <Button className="ml-2" variant="outline-brand" onClick={() => dispatch(clearEditor())}>Cancel</Button>}
            <StatefulButton
              className="send-email-btn"
              variant="primary"
              onClick={(event) => {
                event.preventDefault();
                openTaskAlert();
              }}
              state={emailFormStatus}
              icons={{
                [FORM_SUBMIT_STATES.DEFAULT]: <Icon src={Send} />,
                [FORM_SUBMIT_STATES.SCHEDULE]: <Icon src={Event} />,
                [FORM_SUBMIT_STATES.RESCHEDULE]: <Icon src={Event} />,
                [FORM_SUBMIT_STATES.PENDING]: <Icon src={SpinnerSimple} className="icon-spin" />,
                [FORM_SUBMIT_STATES.COMPLETE]: <Icon src={Check} />,
                [FORM_SUBMIT_STATES.COMPLETE_SCHEDULE]: <Icon src={Check} />,
                [FORM_SUBMIT_STATES.ERROR]: <Icon src={Cancel} />,
              }}
              labels={{
                [FORM_SUBMIT_STATES.DEFAULT]: intl.formatMessage(messages.bulkEmailSubmitButtonDefault),
                [FORM_SUBMIT_STATES.SCHEDULE]: intl.formatMessage(messages.bulkEmailSubmitButtonSchedule),
                [FORM_SUBMIT_STATES.RESCHEDULE]: intl.formatMessage(messages.bulkEmailSubmitButtonReschedule),
                [FORM_SUBMIT_STATES.PENDING]: intl.formatMessage(messages.bulkEmailSubmitButtonPending),
                [FORM_SUBMIT_STATES.COMPLETE]: intl.formatMessage(messages.bulkEmailSubmitButtonComplete),
                [FORM_SUBMIT_STATES.COMPLETE_SCHEDULE]: intl.formatMessage(
                  messages.bulkEmailSubmitButtonCompleteSchedule,
                ),
                [FORM_SUBMIT_STATES.ERROR]: intl.formatMessage(messages.bulkEmailSubmitButtonError),
              }}
              disabledStates={[
                FORM_SUBMIT_STATES.PENDING,
                FORM_SUBMIT_STATES.COMPLETE,
                FORM_SUBMIT_STATES.COMPLETE_SCHEDULE,
              ]}
            />
            <Toast
              show={
                emailFormStatus === FORM_SUBMIT_STATES.ERROR
                || emailFormStatus === FORM_SUBMIT_STATES.COMPLETE
                || emailFormStatus === FORM_SUBMIT_STATES.COMPLETE_SCHEDULE
              }
              onClose={() => resetEmailForm(emailFormStatus === FORM_SUBMIT_STATES.ERROR)}
            >
              {emailFormStatus === FORM_SUBMIT_STATES.ERROR && intl.formatMessage(messages.bulkEmailFormError)}
              {emailFormStatus === FORM_SUBMIT_STATES.COMPLETE && intl.formatMessage(messages.bulkEmailFormSuccess)}
              {emailFormStatus === FORM_SUBMIT_STATES.COMPLETE_SCHEDULE
                && intl.formatMessage(messages.bulkEmailFormScheduledSuccess)}
            </Toast>
          </div>
        </Form.Group>
      </Form>
    </div>
  );
}

BulkEmailForm.defaultProps = {
  cohorts: [],
};

BulkEmailForm.propTypes = {
  courseId: PropTypes.string.isRequired,
  cohorts: PropTypes.arrayOf(PropTypes.string),
  intl: intlShape.isRequired,
};

export default injectIntl(BulkEmailForm);
