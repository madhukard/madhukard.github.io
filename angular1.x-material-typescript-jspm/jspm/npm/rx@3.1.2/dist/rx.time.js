/* */ 
"format cjs";
;
(function(factory) {
  var objectTypes = {
    'function': true,
    'object': true
  };
  var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports,
      freeSelf = objectTypes[typeof self] && self.Object && self,
      freeWindow = objectTypes[typeof window] && window && window.Object && window,
      freeModule = objectTypes[typeof module] && module && !module.nodeType && module,
      moduleExports = freeModule && freeModule.exports === freeExports && freeExports,
      freeGlobal = freeExports && freeModule && typeof global == 'object' && global && global.Object && global;
  var root = root = freeGlobal || ((freeWindow !== (this && this.window)) && freeWindow) || freeSelf || this;
  if (typeof define === 'function' && define.amd) {
    define(['./rx'], function(Rx, exports) {
      return factory(root, exports, Rx);
    });
  } else if (typeof module === 'object' && module && module.exports === freeExports) {
    module.exports = factory(root, module.exports, require('./rx'));
  } else {
    root.Rx = factory(root, {}, root.Rx);
  }
}.call(this, function(root, exp, Rx, undefined) {
  var Observable = Rx.Observable,
      observableProto = Observable.prototype,
      AnonymousObservable = Rx.AnonymousObservable,
      observableDefer = Observable.defer,
      observableEmpty = Observable.empty,
      observableNever = Observable.never,
      observableThrow = Observable['throw'],
      observableFromArray = Observable.fromArray,
      timeoutScheduler = Rx.Scheduler['default'],
      SingleAssignmentDisposable = Rx.SingleAssignmentDisposable,
      SerialDisposable = Rx.SerialDisposable,
      CompositeDisposable = Rx.CompositeDisposable,
      RefCountDisposable = Rx.RefCountDisposable,
      Subject = Rx.Subject,
      addRef = Rx.internals.addRef,
      normalizeTime = Rx.Scheduler.normalize,
      helpers = Rx.helpers,
      isPromise = helpers.isPromise,
      isFunction = helpers.isFunction,
      isScheduler = Rx.Scheduler.isScheduler,
      observableFromPromise = Observable.fromPromise;
  var errorObj = {e: {}};
  function tryCatcherGen(tryCatchTarget) {
    return function tryCatcher() {
      try {
        return tryCatchTarget.apply(this, arguments);
      } catch (e) {
        errorObj.e = e;
        return errorObj;
      }
    };
  }
  var tryCatch = Rx.internals.tryCatch = function tryCatch(fn) {
    if (!isFunction(fn)) {
      throw new TypeError('fn must be a function');
    }
    return tryCatcherGen(fn);
  };
  function thrower(e) {
    throw e;
  }
  function observableTimerDate(dueTime, scheduler) {
    return new AnonymousObservable(function(observer) {
      return scheduler.scheduleWithAbsolute(dueTime, function() {
        observer.onNext(0);
        observer.onCompleted();
      });
    });
  }
  function observableTimerDateAndPeriod(dueTime, period, scheduler) {
    return new AnonymousObservable(function(observer) {
      var d = dueTime,
          p = normalizeTime(period);
      return scheduler.scheduleRecursiveWithAbsoluteAndState(0, d, function(count, self) {
        if (p > 0) {
          var now = scheduler.now();
          d = d + p;
          d <= now && (d = now + p);
        }
        observer.onNext(count);
        self(count + 1, d);
      });
    });
  }
  function observableTimerTimeSpan(dueTime, scheduler) {
    return new AnonymousObservable(function(observer) {
      return scheduler.scheduleWithRelative(normalizeTime(dueTime), function() {
        observer.onNext(0);
        observer.onCompleted();
      });
    });
  }
  function observableTimerTimeSpanAndPeriod(dueTime, period, scheduler) {
    return dueTime === period ? new AnonymousObservable(function(observer) {
      return scheduler.schedulePeriodicWithState(0, period, function(count) {
        observer.onNext(count);
        return count + 1;
      });
    }) : observableDefer(function() {
      return observableTimerDateAndPeriod(scheduler.now() + dueTime, period, scheduler);
    });
  }
  var observableinterval = Observable.interval = function(period, scheduler) {
    return observableTimerTimeSpanAndPeriod(period, period, isScheduler(scheduler) ? scheduler : timeoutScheduler);
  };
  var observableTimer = Observable.timer = function(dueTime, periodOrScheduler, scheduler) {
    var period;
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    if (periodOrScheduler != null && typeof periodOrScheduler === 'number') {
      period = periodOrScheduler;
    } else if (isScheduler(periodOrScheduler)) {
      scheduler = periodOrScheduler;
    }
    if (dueTime instanceof Date && period === undefined) {
      return observableTimerDate(dueTime.getTime(), scheduler);
    }
    if (dueTime instanceof Date && period !== undefined) {
      return observableTimerDateAndPeriod(dueTime.getTime(), periodOrScheduler, scheduler);
    }
    return period === undefined ? observableTimerTimeSpan(dueTime, scheduler) : observableTimerTimeSpanAndPeriod(dueTime, period, scheduler);
  };
  function observableDelayRelative(source, dueTime, scheduler) {
    return new AnonymousObservable(function(o) {
      var active = false,
          cancelable = new SerialDisposable(),
          exception = null,
          q = [],
          running = false,
          subscription;
      subscription = source.materialize().timestamp(scheduler).subscribe(function(notification) {
        var d,
            shouldRun;
        if (notification.value.kind === 'E') {
          q = [];
          q.push(notification);
          exception = notification.value.exception;
          shouldRun = !running;
        } else {
          q.push({
            value: notification.value,
            timestamp: notification.timestamp + dueTime
          });
          shouldRun = !active;
          active = true;
        }
        if (shouldRun) {
          if (exception !== null) {
            o.onError(exception);
          } else {
            d = new SingleAssignmentDisposable();
            cancelable.setDisposable(d);
            d.setDisposable(scheduler.scheduleRecursiveWithRelative(dueTime, function(self) {
              var e,
                  recurseDueTime,
                  result,
                  shouldRecurse;
              if (exception !== null) {
                return;
              }
              running = true;
              do {
                result = null;
                if (q.length > 0 && q[0].timestamp - scheduler.now() <= 0) {
                  result = q.shift().value;
                }
                if (result !== null) {
                  result.accept(o);
                }
              } while (result !== null);
              shouldRecurse = false;
              recurseDueTime = 0;
              if (q.length > 0) {
                shouldRecurse = true;
                recurseDueTime = Math.max(0, q[0].timestamp - scheduler.now());
              } else {
                active = false;
              }
              e = exception;
              running = false;
              if (e !== null) {
                o.onError(e);
              } else if (shouldRecurse) {
                self(recurseDueTime);
              }
            }));
          }
        }
      });
      return new CompositeDisposable(subscription, cancelable);
    }, source);
  }
  function observableDelayAbsolute(source, dueTime, scheduler) {
    return observableDefer(function() {
      return observableDelayRelative(source, dueTime - scheduler.now(), scheduler);
    });
  }
  function delayWithSelector(source, subscriptionDelay, delayDurationSelector) {
    var subDelay,
        selector;
    if (isFunction(subscriptionDelay)) {
      selector = subscriptionDelay;
    } else {
      subDelay = subscriptionDelay;
      selector = delayDurationSelector;
    }
    return new AnonymousObservable(function(o) {
      var delays = new CompositeDisposable(),
          atEnd = false,
          subscription = new SerialDisposable();
      function start() {
        subscription.setDisposable(source.subscribe(function(x) {
          var delay = tryCatch(selector)(x);
          if (delay === errorObj) {
            return o.onError(delay.e);
          }
          var d = new SingleAssignmentDisposable();
          delays.add(d);
          d.setDisposable(delay.subscribe(function() {
            o.onNext(x);
            delays.remove(d);
            done();
          }, function(e) {
            o.onError(e);
          }, function() {
            o.onNext(x);
            delays.remove(d);
            done();
          }));
        }, function(e) {
          o.onError(e);
        }, function() {
          atEnd = true;
          subscription.dispose();
          done();
        }));
      }
      function done() {
        atEnd && delays.length === 0 && o.onCompleted();
      }
      if (!subDelay) {
        start();
      } else {
        subscription.setDisposable(subDelay.subscribe(start, function(e) {
          o.onError(e);
        }, start));
      }
      return new CompositeDisposable(subscription, delays);
    }, this);
  }
  observableProto.delay = function() {
    if (typeof arguments[0] === 'number' || arguments[0] instanceof Date) {
      var dueTime = arguments[0],
          scheduler = arguments[1];
      isScheduler(scheduler) || (scheduler = timeoutScheduler);
      return dueTime instanceof Date ? observableDelayAbsolute(this, dueTime, scheduler) : observableDelayRelative(this, dueTime, scheduler);
    } else if (isFunction(arguments[0])) {
      return delayWithSelector(this, arguments[0], arguments[1]);
    } else {
      throw new Error('Invalid arguments');
    }
  };
  function debounce(source, dueTime, scheduler) {
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    return new AnonymousObservable(function(observer) {
      var cancelable = new SerialDisposable(),
          hasvalue = false,
          value,
          id = 0;
      var subscription = source.subscribe(function(x) {
        hasvalue = true;
        value = x;
        id++;
        var currentId = id,
            d = new SingleAssignmentDisposable();
        cancelable.setDisposable(d);
        d.setDisposable(scheduler.scheduleWithRelative(dueTime, function() {
          hasvalue && id === currentId && observer.onNext(value);
          hasvalue = false;
        }));
      }, function(e) {
        cancelable.dispose();
        observer.onError(e);
        hasvalue = false;
        id++;
      }, function() {
        cancelable.dispose();
        hasvalue && observer.onNext(value);
        observer.onCompleted();
        hasvalue = false;
        id++;
      });
      return new CompositeDisposable(subscription, cancelable);
    }, this);
  }
  function debounceWithSelector(source, durationSelector) {
    return new AnonymousObservable(function(o) {
      var value,
          hasValue = false,
          cancelable = new SerialDisposable(),
          id = 0;
      var subscription = source.subscribe(function(x) {
        var throttle = tryCatch(durationSelector)(x);
        if (throttle === errorObj) {
          return o.onError(throttle.e);
        }
        isPromise(throttle) && (throttle = observableFromPromise(throttle));
        hasValue = true;
        value = x;
        id++;
        var currentid = id,
            d = new SingleAssignmentDisposable();
        cancelable.setDisposable(d);
        d.setDisposable(throttle.subscribe(function() {
          hasValue && id === currentid && o.onNext(value);
          hasValue = false;
          d.dispose();
        }, function(e) {
          o.onError(e);
        }, function() {
          hasValue && id === currentid && o.onNext(value);
          hasValue = false;
          d.dispose();
        }));
      }, function(e) {
        cancelable.dispose();
        o.onError(e);
        hasValue = false;
        id++;
      }, function() {
        cancelable.dispose();
        hasValue && o.onNext(value);
        o.onCompleted();
        hasValue = false;
        id++;
      });
      return new CompositeDisposable(subscription, cancelable);
    }, source);
  }
  observableProto.debounce = function() {
    if (isFunction(arguments[0])) {
      return debounceWithSelector(this, arguments[0]);
    } else if (typeof arguments[0] === 'number') {
      return debounce(this, arguments[0], arguments[1]);
    } else {
      throw new Error('Invalid arguments');
    }
  };
  observableProto.windowWithTime = function(timeSpan, timeShiftOrScheduler, scheduler) {
    var source = this,
        timeShift;
    timeShiftOrScheduler == null && (timeShift = timeSpan);
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    if (typeof timeShiftOrScheduler === 'number') {
      timeShift = timeShiftOrScheduler;
    } else if (isScheduler(timeShiftOrScheduler)) {
      timeShift = timeSpan;
      scheduler = timeShiftOrScheduler;
    }
    return new AnonymousObservable(function(observer) {
      var groupDisposable,
          nextShift = timeShift,
          nextSpan = timeSpan,
          q = [],
          refCountDisposable,
          timerD = new SerialDisposable(),
          totalTime = 0;
      groupDisposable = new CompositeDisposable(timerD), refCountDisposable = new RefCountDisposable(groupDisposable);
      function createTimer() {
        var m = new SingleAssignmentDisposable(),
            isSpan = false,
            isShift = false;
        timerD.setDisposable(m);
        if (nextSpan === nextShift) {
          isSpan = true;
          isShift = true;
        } else if (nextSpan < nextShift) {
          isSpan = true;
        } else {
          isShift = true;
        }
        var newTotalTime = isSpan ? nextSpan : nextShift,
            ts = newTotalTime - totalTime;
        totalTime = newTotalTime;
        if (isSpan) {
          nextSpan += timeShift;
        }
        if (isShift) {
          nextShift += timeShift;
        }
        m.setDisposable(scheduler.scheduleWithRelative(ts, function() {
          if (isShift) {
            var s = new Subject();
            q.push(s);
            observer.onNext(addRef(s, refCountDisposable));
          }
          isSpan && q.shift().onCompleted();
          createTimer();
        }));
      }
      ;
      q.push(new Subject());
      observer.onNext(addRef(q[0], refCountDisposable));
      createTimer();
      groupDisposable.add(source.subscribe(function(x) {
        for (var i = 0,
            len = q.length; i < len; i++) {
          q[i].onNext(x);
        }
      }, function(e) {
        for (var i = 0,
            len = q.length; i < len; i++) {
          q[i].onError(e);
        }
        observer.onError(e);
      }, function() {
        for (var i = 0,
            len = q.length; i < len; i++) {
          q[i].onCompleted();
        }
        observer.onCompleted();
      }));
      return refCountDisposable;
    }, source);
  };
  observableProto.windowWithTimeOrCount = function(timeSpan, count, scheduler) {
    var source = this;
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    return new AnonymousObservable(function(observer) {
      var timerD = new SerialDisposable(),
          groupDisposable = new CompositeDisposable(timerD),
          refCountDisposable = new RefCountDisposable(groupDisposable),
          n = 0,
          windowId = 0,
          s = new Subject();
      function createTimer(id) {
        var m = new SingleAssignmentDisposable();
        timerD.setDisposable(m);
        m.setDisposable(scheduler.scheduleWithRelative(timeSpan, function() {
          if (id !== windowId) {
            return;
          }
          n = 0;
          var newId = ++windowId;
          s.onCompleted();
          s = new Subject();
          observer.onNext(addRef(s, refCountDisposable));
          createTimer(newId);
        }));
      }
      observer.onNext(addRef(s, refCountDisposable));
      createTimer(0);
      groupDisposable.add(source.subscribe(function(x) {
        var newId = 0,
            newWindow = false;
        s.onNext(x);
        if (++n === count) {
          newWindow = true;
          n = 0;
          newId = ++windowId;
          s.onCompleted();
          s = new Subject();
          observer.onNext(addRef(s, refCountDisposable));
        }
        newWindow && createTimer(newId);
      }, function(e) {
        s.onError(e);
        observer.onError(e);
      }, function() {
        s.onCompleted();
        observer.onCompleted();
      }));
      return refCountDisposable;
    }, source);
  };
  function toArray(x) {
    return x.toArray();
  }
  observableProto.bufferWithTime = function(timeSpan, timeShiftOrScheduler, scheduler) {
    return this.windowWithTime(timeSpan, timeShiftOrScheduler, scheduler).flatMap(toArray);
  };
  function toArray(x) {
    return x.toArray();
  }
  observableProto.bufferWithTimeOrCount = function(timeSpan, count, scheduler) {
    return this.windowWithTimeOrCount(timeSpan, count, scheduler).flatMap(toArray);
  };
  observableProto.timeInterval = function(scheduler) {
    var source = this;
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    return observableDefer(function() {
      var last = scheduler.now();
      return source.map(function(x) {
        var now = scheduler.now(),
            span = now - last;
        last = now;
        return {
          value: x,
          interval: span
        };
      });
    });
  };
  observableProto.timestamp = function(scheduler) {
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    return this.map(function(x) {
      return {
        value: x,
        timestamp: scheduler.now()
      };
    });
  };
  function sampleObservable(source, sampler) {
    return new AnonymousObservable(function(o) {
      var atEnd = false,
          value,
          hasValue = false;
      function sampleSubscribe() {
        if (hasValue) {
          hasValue = false;
          o.onNext(value);
        }
        atEnd && o.onCompleted();
      }
      var sourceSubscription = new SingleAssignmentDisposable();
      sourceSubscription.setDisposable(source.subscribe(function(newValue) {
        hasValue = true;
        value = newValue;
      }, function(e) {
        o.onError(e);
      }, function() {
        atEnd = true;
        sourceSubscription.dispose();
      }));
      return new CompositeDisposable(sourceSubscription, sampler.subscribe(sampleSubscribe, function(e) {
        o.onError(e);
      }, sampleSubscribe));
    }, source);
  }
  observableProto.sample = observableProto.throttleLatest = function(intervalOrSampler, scheduler) {
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    return typeof intervalOrSampler === 'number' ? sampleObservable(this, observableinterval(intervalOrSampler, scheduler)) : sampleObservable(this, intervalOrSampler);
  };
  var TimeoutError = Rx.TimeoutError = function(message) {
    this.message = message || 'Timeout has occurred';
    this.name = 'TimeoutError';
    Error.call(this);
  };
  TimeoutError.prototype = Object.create(Error.prototype);
  function timeoutWithSelector(source, firstTimeout, timeoutDurationSelector, other) {
    if (isFunction(firstTimeout)) {
      other = timeoutDurationSelector;
      timeoutDurationSelector = firstTimeout;
      firstTimeout = observableNever();
    }
    other || (other = observableThrow(new TimeoutError()));
    return new AnonymousObservable(function(o) {
      var subscription = new SerialDisposable(),
          timer = new SerialDisposable(),
          original = new SingleAssignmentDisposable();
      subscription.setDisposable(original);
      var id = 0,
          switched = false;
      function setTimer(timeout) {
        var myId = id,
            d = new SingleAssignmentDisposable();
        timer.setDisposable(d);
        d.setDisposable(timeout.subscribe(function() {
          id === myId && subscription.setDisposable(other.subscribe(o));
          d.dispose();
        }, function(e) {
          id === myId && o.onError(e);
        }, function() {
          id === myId && subscription.setDisposable(other.subscribe(o));
        }));
      }
      ;
      setTimer(firstTimeout);
      function oWins() {
        var res = !switched;
        if (res) {
          id++;
        }
        return res;
      }
      original.setDisposable(source.subscribe(function(x) {
        if (oWins()) {
          o.onNext(x);
          var timeout = tryCatch(timeoutDurationSelector)(x);
          if (timeout === errorObj) {
            return o.onError(timeout.e);
          }
          setTimer(isPromise(timeout) ? observableFromPromise(timeout) : timeout);
        }
      }, function(e) {
        oWins() && o.onError(e);
      }, function() {
        oWins() && o.onCompleted();
      }));
      return new CompositeDisposable(subscription, timer);
    }, source);
  }
  function timeout(source, dueTime, other, scheduler) {
    if (other == null) {
      throw new Error('other or scheduler must be specified');
    }
    if (isScheduler(other)) {
      scheduler = other;
      other = observableThrow(new TimeoutError());
    }
    if (other instanceof Error) {
      other = observableThrow(other);
    }
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    var schedulerMethod = dueTime instanceof Date ? 'scheduleWithAbsolute' : 'scheduleWithRelative';
    return new AnonymousObservable(function(o) {
      var id = 0,
          original = new SingleAssignmentDisposable(),
          subscription = new SerialDisposable(),
          switched = false,
          timer = new SerialDisposable();
      subscription.setDisposable(original);
      function createTimer() {
        var myId = id;
        timer.setDisposable(scheduler[schedulerMethod](dueTime, function() {
          if (id === myId) {
            isPromise(other) && (other = observableFromPromise(other));
            subscription.setDisposable(other.subscribe(o));
          }
        }));
      }
      createTimer();
      original.setDisposable(source.subscribe(function(x) {
        if (!switched) {
          id++;
          o.onNext(x);
          createTimer();
        }
      }, function(e) {
        if (!switched) {
          id++;
          o.onError(e);
        }
      }, function() {
        if (!switched) {
          id++;
          o.onCompleted();
        }
      }));
      return new CompositeDisposable(subscription, timer);
    }, source);
  }
  observableProto.timeout = function() {
    var firstArg = arguments[0];
    if (firstArg instanceof Date || typeof firstArg === 'number') {
      return timeout(this, firstArg, arguments[1], arguments[2]);
    } else if (Observable.isObservable(firstArg) || isFunction(firstArg)) {
      return timeoutWithSelector(this, firstArg, arguments[1], arguments[2]);
    } else {
      throw new Error('Invalid arguments');
    }
  };
  Observable.generateWithAbsoluteTime = function(initialState, condition, iterate, resultSelector, timeSelector, scheduler) {
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    return new AnonymousObservable(function(observer) {
      var first = true,
          hasResult = false;
      return scheduler.scheduleRecursiveWithAbsoluteAndState(initialState, scheduler.now(), function(state, self) {
        hasResult && observer.onNext(state);
        try {
          if (first) {
            first = false;
          } else {
            state = iterate(state);
          }
          hasResult = condition(state);
          if (hasResult) {
            var result = resultSelector(state);
            var time = timeSelector(state);
          }
        } catch (e) {
          observer.onError(e);
          return;
        }
        if (hasResult) {
          self(result, time);
        } else {
          observer.onCompleted();
        }
      });
    });
  };
  Observable.generateWithRelativeTime = function(initialState, condition, iterate, resultSelector, timeSelector, scheduler) {
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    return new AnonymousObservable(function(observer) {
      var first = true,
          hasResult = false;
      return scheduler.scheduleRecursiveWithRelativeAndState(initialState, 0, function(state, self) {
        hasResult && observer.onNext(state);
        try {
          if (first) {
            first = false;
          } else {
            state = iterate(state);
          }
          hasResult = condition(state);
          if (hasResult) {
            var result = resultSelector(state);
            var time = timeSelector(state);
          }
        } catch (e) {
          observer.onError(e);
          return;
        }
        if (hasResult) {
          self(result, time);
        } else {
          observer.onCompleted();
        }
      });
    });
  };
  observableProto.delaySubscription = function(dueTime, scheduler) {
    var scheduleMethod = dueTime instanceof Date ? 'scheduleWithAbsolute' : 'scheduleWithRelative';
    var source = this;
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    return new AnonymousObservable(function(o) {
      var d = new SerialDisposable();
      d.setDisposable(scheduler[scheduleMethod](dueTime, function() {
        d.setDisposable(source.subscribe(o));
      }));
      return d;
    }, this);
  };
  observableProto.skipLastWithTime = function(duration, scheduler) {
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    var source = this;
    return new AnonymousObservable(function(o) {
      var q = [];
      return source.subscribe(function(x) {
        var now = scheduler.now();
        q.push({
          interval: now,
          value: x
        });
        while (q.length > 0 && now - q[0].interval >= duration) {
          o.onNext(q.shift().value);
        }
      }, function(e) {
        o.onError(e);
      }, function() {
        var now = scheduler.now();
        while (q.length > 0 && now - q[0].interval >= duration) {
          o.onNext(q.shift().value);
        }
        o.onCompleted();
      });
    }, source);
  };
  observableProto.takeLastWithTime = function(duration, scheduler) {
    var source = this;
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    return new AnonymousObservable(function(o) {
      var q = [];
      return source.subscribe(function(x) {
        var now = scheduler.now();
        q.push({
          interval: now,
          value: x
        });
        while (q.length > 0 && now - q[0].interval >= duration) {
          q.shift();
        }
      }, function(e) {
        o.onError(e);
      }, function() {
        var now = scheduler.now();
        while (q.length > 0) {
          var next = q.shift();
          if (now - next.interval <= duration) {
            o.onNext(next.value);
          }
        }
        o.onCompleted();
      });
    }, source);
  };
  observableProto.takeLastBufferWithTime = function(duration, scheduler) {
    var source = this;
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    return new AnonymousObservable(function(o) {
      var q = [];
      return source.subscribe(function(x) {
        var now = scheduler.now();
        q.push({
          interval: now,
          value: x
        });
        while (q.length > 0 && now - q[0].interval >= duration) {
          q.shift();
        }
      }, function(e) {
        o.onError(e);
      }, function() {
        var now = scheduler.now(),
            res = [];
        while (q.length > 0) {
          var next = q.shift();
          now - next.interval <= duration && res.push(next.value);
        }
        o.onNext(res);
        o.onCompleted();
      });
    }, source);
  };
  observableProto.takeWithTime = function(duration, scheduler) {
    var source = this;
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    return new AnonymousObservable(function(o) {
      return new CompositeDisposable(scheduler.scheduleWithRelative(duration, function() {
        o.onCompleted();
      }), source.subscribe(o));
    }, source);
  };
  observableProto.skipWithTime = function(duration, scheduler) {
    var source = this;
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    return new AnonymousObservable(function(observer) {
      var open = false;
      return new CompositeDisposable(scheduler.scheduleWithRelative(duration, function() {
        open = true;
      }), source.subscribe(function(x) {
        open && observer.onNext(x);
      }, observer.onError.bind(observer), observer.onCompleted.bind(observer)));
    }, source);
  };
  observableProto.skipUntilWithTime = function(startTime, scheduler) {
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    var source = this,
        schedulerMethod = startTime instanceof Date ? 'scheduleWithAbsolute' : 'scheduleWithRelative';
    return new AnonymousObservable(function(o) {
      var open = false;
      return new CompositeDisposable(scheduler[schedulerMethod](startTime, function() {
        open = true;
      }), source.subscribe(function(x) {
        open && o.onNext(x);
      }, function(e) {
        o.onError(e);
      }, function() {
        o.onCompleted();
      }));
    }, source);
  };
  observableProto.takeUntilWithTime = function(endTime, scheduler) {
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    var source = this,
        schedulerMethod = endTime instanceof Date ? 'scheduleWithAbsolute' : 'scheduleWithRelative';
    return new AnonymousObservable(function(o) {
      return new CompositeDisposable(scheduler[schedulerMethod](endTime, function() {
        o.onCompleted();
      }), source.subscribe(o));
    }, source);
  };
  observableProto.throttle = function(windowDuration, scheduler) {
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    var duration = +windowDuration || 0;
    if (duration <= 0) {
      throw new RangeError('windowDuration cannot be less or equal zero.');
    }
    var source = this;
    return new AnonymousObservable(function(o) {
      var lastOnNext = 0;
      return source.subscribe(function(x) {
        var now = scheduler.now();
        if (lastOnNext === 0 || now - lastOnNext >= duration) {
          lastOnNext = now;
          o.onNext(x);
        }
      }, function(e) {
        o.onError(e);
      }, function() {
        o.onCompleted();
      });
    }, source);
  };
  return Rx;
}));
