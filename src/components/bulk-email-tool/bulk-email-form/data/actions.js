export const handleEditorChange = (fieldName, fieldValue) => ({
  type: 'EDITOR_ON_CHANGE',
  payload: {
    [fieldName]: fieldValue,
  },
});

export const clearEditor = () => ({
  type: 'CLEAR_EDITOR',
});

export const clearErrorState = () => ({
  type: 'CLEAR_ERROR',
});

export const copyToEditor = (payload) => ({
  type: 'COPY_TO_EDITOR',
  payload,
});

export const addRecipient = (payload) => ({
  type: 'ADD_RECIPIENT',
  payload,
});

export const removeRecipient = (payload) => ({
  type: 'REMOVE_RECIPIENT',
  payload,
});

export const clearRecipients = () => ({
  type: 'CLEAR_RECIPIENTS',
});

export const clearDateTime = () => ({
  type: 'CLEAR_DATE_TIME',
});

export const setEditMode = (editMode = false) => ({
  type: 'SET_EDIT_MODE',
  payload: editMode,
});

export const patchScheduledEmail = () => ({
  type: 'PATCH_SCHEDULED_EMAIL',
});

export const patchScheduledEmailStart = () => ({
  type: 'PATCH_START',
});

export const patchScheduledEmailComplete = () => ({
  type: 'PATCH_COMPLETE',
});

export const patchScheduledEmailError = () => ({
  type: 'PATCH_FAILURE',
});

export const postBulkEmail = () => ({
  type: 'POST_BULK_EMAIL',
});

export const postBulkEmailStart = () => ({
  type: 'POST_START',
});

export const postBulkEmailComplete = () => ({
  type: 'POST_COMPLETE',
});

export const postBulkEmailError = () => ({
  type: 'POST_FAILURE',
});
