import _ from 'lodash';
import { coreModule } from 'app/core/core';
import { MetricsPanelCtrl } from 'app/plugins/sdk';
import { AnnotationEvent } from '@grafana/data';
import { dateTime } from '@grafana/data';
import { AnnotationsSrv } from './all';
import { VariableSrv } from '../templating/variable_srv';

export class EventEditorCtrl {
  panelCtrl: MetricsPanelCtrl;
  event: AnnotationEvent;
  timeRange: { from: number; to: number };
  form: any;
  close: any;
  timeFormated: string;

  /** @ngInject */
  constructor(private annotationsSrv: AnnotationsSrv, private variableSrv: VariableSrv) {
    this.event.panelId = this.panelCtrl.panel.id;
    this.event.dashboardId = this.panelCtrl.dashboard.id;

    // Annotations query returns time as Unix timestamp in milliseconds
    this.event.time = tryEpochToMoment(this.event.time);
    if (this.event.isRegion) {
      this.event.timeEnd = tryEpochToMoment(this.event.timeEnd);
    }

    this.timeFormated = this.panelCtrl.dashboard.formatDate(this.event.time);

    if (!this.event.id) {
      this.variableSrv.variables.forEach(variable => {
        if (variable.name === 'annotation_default_description') {
          this.event.text = variable.current.value;
        }
        if (variable.name === 'annotation_default_tags') {
          this.event.tags = variable.current.value;
        }
      });
    }
  }

  save() {
    if (!this.form.$valid) {
      return;
    }

    const saveModel = _.cloneDeep(this.event);
    saveModel.time = saveModel.time.valueOf();
    saveModel.timeEnd = 0;

    if (saveModel.isRegion) {
      saveModel.timeEnd = this.event.timeEnd.valueOf();

      if (saveModel.timeEnd < saveModel.time) {
        console.log('invalid time');
        return;
      }
    }

    if (saveModel.id) {
      this.annotationsSrv
        .updateAnnotationEvent(saveModel)
        .then(() => {
          this.panelCtrl.refresh();
          this.close();
        })
        .catch(() => {
          this.panelCtrl.refresh();
          this.close();
        });
    } else {
      this.annotationsSrv
        .saveAnnotationEvent(saveModel)
        .then(() => {
          this.panelCtrl.refresh();
          this.close();
        })
        .catch(() => {
          this.panelCtrl.refresh();
          this.close();
        });
    }
  }

  delete() {
    return this.annotationsSrv
      .deleteAnnotationEvent(this.event)
      .then(() => {
        this.panelCtrl.refresh();
        this.close();
      })
      .catch(() => {
        this.panelCtrl.refresh();
        this.close();
      });
  }
}

function tryEpochToMoment(timestamp: any) {
  if (timestamp && _.isNumber(timestamp)) {
    const epoch = Number(timestamp);
    return dateTime(epoch);
  } else {
    return timestamp;
  }
}

export function eventEditor() {
  return {
    restrict: 'E',
    controller: EventEditorCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    templateUrl: 'public/app/features/annotations/partials/event_editor.html',
    scope: {
      panelCtrl: '=',
      event: '=',
      close: '&',
    },
  };
}

coreModule.directive('eventEditor', eventEditor);
