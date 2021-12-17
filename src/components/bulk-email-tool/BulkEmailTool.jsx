import React, { useState, useEffect } from 'react';
import classnames from 'classnames';

import { useParams } from 'react-router-dom';
import { Spinner } from '@edx/paragon';
import { ErrorPage } from '@edx/frontend-platform/react';
import BulkEmailRecepient from './BulkEmailRecepient';
import BulkEmailBody from './BulkEmailBody';
import BulkEmailTaskManager from './bulk-email-task-manager/BulkEmailTaskManager';
import Navigationtabs from '../navigation-tabs/NavigationTabs';
import { getCourseHomeCourseMetadata } from './api';
import useMobileResponsive from '../../utils/useMobileResponsive';

export default function BulkEmailTool() {
  const { courseId } = useParams();

  const [courseMetadata, setCourseMetadata] = useState();
  const isMobile = useMobileResponsive();

  useEffect(() => {
    async function fetchTabData() {
      let data;
      try {
        data = await getCourseHomeCourseMetadata(courseId);
      } catch (e) {
        setCourseMetadata({
          isStaff: false,
          tabs: [],
        });
        return;
      }
      const { tabs, is_staff: isStaff } = data;
      setCourseMetadata({
        isStaff,
        tabs: [...tabs],
      });
    }
    fetchTabData();
  }, []);

  if (courseMetadata) {
    return (
      courseMetadata.isStaff ? (
        <div>
          <Navigationtabs courseId={courseId} tabData={courseMetadata.tabs} />
          <div className={classnames({ 'border border-primary-200': !isMobile })}>
            <div className="row">
              <BulkEmailRecepient courseId={courseId} />
            </div>
            <div className="row">
              <BulkEmailBody courseId={courseId} />
            </div>
            <div className="row">
              <BulkEmailTaskManager courseId={courseId} />
            </div>
          </div>
        </div>
      ) : <ErrorPage />
    );
  }
  return (
    <div className="d-flex justify-content-center">
      <Spinner
        animation="border"
        variant="primary"
        role="status"
        screenReaderText="loading"
        className="spinner-border spinner-border-lg text-primary p-5 m-5"
      />
    </div>
  );
}
