
angular.module('rmzcommunityapp.notificationservice',[])
.service('NotificationService',function(DbService,ModalService,GetPostService, UtilityService,HttpService,$rootScope,GetPostService,$state,GetReactionsService){
  DbService.initDB();
  DbService.loadDB(UtilityService.notificationCollection);
  var self = this;
  var notificationBadge =0;
  $rootScope.notificationData = [];
  this.notificationTimer = 300000;
  this.notificationActions ={};
  this.pushService = function(type){
  if(type == 'android'){
    var pushInit = PushNotification.init({
        "android": {
            "senderID": "966958589484",
            "sound": true,
            "clearBadge":true
        }
    });
  }else{
    var pushInit = PushNotification.init({
        "ios": {
              badge: true,
              sound: true,
              alert: true,
              clearBadge:true
        }
    });
  }

    pushInit.on("registration", function(data){
      console.log(JSON.stringify(data));
      DbService.loadDB(UtilityService.notificationCollection);
      var notification = DbService.getData(UtilityService.notificationCollection);
             if(!angular.equals([],notification)){
               UtilityService.notificationDataBase = notification;
             }
             UtilityService.notificationDataBase[0].Token= data.registrationId;
             var notify = DbService.insertOrUpdate(UtilityService.notificationCollection,UtilityService.notificationDataBase)

    });
    pushInit.on("notification", function(data){
    notificationBadge = data.Badge_Count;
    if(data.additionalData.foreground == false){
    self.doNotificationAction(data.additionalData.extra_info.EventAction,data.additionalData.extra_info,data.Id);
  }
     });
     pushInit.setApplicationIconBadgeNumber(function(){
            console.log('success badge');
     },function(){
       console.log('badge failed');
     },notificationBadge);
    //  pushInit.off("notification", function(data){
    //    console.log(JSON.stringify(data));
    //   });
    pushInit.on("error", function(e){
      alert(e.message);
    });
    pushInit.on("finish", function(e){
      alert('finish');
    });
  }

  this.doNotificationAction = function(action, data, notificationId, eventId){
    switch (action) {
      case 'TEST NOTIFICATION':
      console.log('test notification');
      break;
      case 'LIKE_POST':
            self.getPost(data.PostId, notificationId,function(){
              $state.go('viewposts');
            });
      break;
      case 'LIKE_COMMENT':
            self.getPost(data.PostId, notificationId,function(){
              $state.go('viewposts');
            });
      break;
      case 'POST_COMMENT':
            self.getPost(data.PostId, notificationId,function(){
              $state.go('viewposts');
            });
      break;
      case 'BAY_ORDER_ACCEPTED':
            self.openBayOrderHistory();
            self.updateNotificationStatus(notificationId);
      break;
      case 'BAY_ORDER_REJECTED':
            self.openBayOrderHistory();
            self.updateNotificationStatus(notificationId);
      break;
      case 'BAY_ORDER_READY':
            self.openBayOrderHistory();
            self.updateNotificationStatus(notificationId);
      break;
      case 'BAY_ORDER_DELIVERED':
            self.openBayOrderHistory();
            self.updateNotificationStatus(notificationId);
      break;
      case 'NEW_EVENT':
            self.getEvent(notificationId,data.EventId);
      break;
      case 'COMMENT_EVENT':
      self.getEvent(notificationId,data.EventId);
      break;
      case 'EVENT_REMINDER':
      self.getEvent(notificationId,data.EventId);
      break;
      case 'ADMIN_ADD_POST':
      self.getPost(data.PostId, notificationId,function(){
        $state.go('viewposts');
      });
      break;
      case 'MEETING_REQUEST':
      UtilityService.vmSelectedTab=1;
      ModalService.globalModal('views/visitormanagement.html').then(function (modal) {
         modal.show();
      });
      self.updateNotificationStatus(notificationId);
      break;
      case 'SIG_NEW_POST':
      self.getPost(data.PostId, notificationId,function(){
        $state.go('viewposts');
      });
      break;
      case 'TICKET_STATUS_CHANGE':
      GetPostService.set({IssueId:data.IssueId});
      $state.go('shootissuedetails');
      self.updateNotificationStatus(notificationId);
      break;
      default:

    }
  }

  this.loadLocalData = function(){
    DbService.loadDB(UtilityService.localDbCollection);
    return DbService.getData(UtilityService.localDbCollection)[0];
   }
  this.getPost = function(postId,notificationId, callBack){
        var loggedInData= self.loadLocalData();
        var reactions = GetReactionsService.get();
        var getPostApi = HttpService.getMethod('NewsFeed/GetPostById',{'MemberId':loggedInData.MemberInfo.MemberId,
                                                                       'postId':postId,'notificationId':notificationId });
        HttpService.httpCall(getPostApi).then(function(res){
          if (res.data.ResultData.LikedPost >0) {
              var myReaction = reactions[res.data.ResultData.LikedPost-1];
              if(myReaction != null)
              {
              res.data.ResultData.likeText = myReaction.ReactionText;
              res.data.ResultData.likeImage = myReaction.Src;
              res.data.ResultData.likeTextClass ="hwf-main-font";
              res.data.ResultData.likeBtnClass = myReaction.Class;
              res.data.ResultData.reactionId =myReaction.ReactionId;
            }
          }else{
            res.data.ResultData.likeBtnClass= "like-button-img";
            res.data.ResultData.likeTextClass = "font-black"
            res.data.ResultData.likeImage = "img/like_normal.png";
            res.data.ResultData.likeText = "Like";
          }

          GetPostService.set(res.data.ResultData);
          callBack();
        })
  }
  //insertType=1 -- append
  //insertType=2 -- prepend
  this.getNotificationByMember = function(addType,insertType){
    var loggedInData= self.loadLocalData();
    var getNotificationByMemberApi = HttpService.getMethod('notification/getNotificationCountByMemberId',{'member_id':loggedInData.MemberInfo.MemberId});
    getNotificationByMemberApi.showLoader = false;
    HttpService.httpCall(getNotificationByMemberApi).then(function(res){
      self.updateNotificationCount(res.data.NotificationCount);
    })
  }
  //type -1 = insert
  //type -2 = push with old data
  this.updateNotification = function(notification, type,insertType, callBack){
    var notificationData = DbService.getData(UtilityService.notificationCollection);
    if(angular.equals([],notificationData)){
      notificationData = UtilityService.notificationDataBase;
    }
    if(type == 3){
      notificationData[0].Notifications = [];
    }
    angular.forEach(notification, function(value, key){
      value.AddedTime = UtilityService.postedDate(new Date(value.AddedDate))
      if(insertType == 1){
       notificationData[0].Notifications.push(value);
      }else{
        notificationData[0].Notifications.splice(0,0,value);

      }
    })
    $rootScope.notificationData = DbService.insertOrUpdate(UtilityService.notificationCollection,notificationData).data[0].Notifications;
    if(callBack)
    callBack()
  }
  this.updateNotificationCount = function(count){
    $rootScope.notificationCount = count;
    $rootScope.notifyBadgeCount = count;
  }
  this.updateNotificationByMember = function(addType,insertType, callBack){
    var loggedInData= self.loadLocalData();
    var updateNotificationsApi = HttpService.postMethod('notification/updateNotificationsByMember?memberId='+loggedInData.MemberInfo.MemberId,{});
    updateNotificationsApi.showLoader=true;
    HttpService.httpCall(updateNotificationsApi).then(function(res){
      if(res.status == 200){
        self.updateNotification(res.data,addType, insertType, callBack);
      }
    })
  }
  this.startNotificationInterval = function(){
    try{
      var member= self.loadLocalData();
      $rootScope.notificationInterval = setInterval(function () {
        if(member){
          if(member.Status != 1){
            clearInterval($rootScope.notificationInterval);
          }
        }

       self.getNotificationByMember(UtilityService.notificationAddType.push,UtilityService.notificationAddType.splice);
     }, self.notificationTimer);

    }
    catch(e){
      console.log(e);
    }
  }

  this.stopNotificationInterval = function(){
    clearInterval($rootScope.notificationInterval);
  }

  this.openBayOrderHistory = function(){
    ModalService.globalModal('views/bayorderhistory.html').then(function (modal) {
       modal.show();
    });
  }

   this.getEvent = function(notificationId,eventObj){
     DbService.loadDB(UtilityService.localDbCollection);
     var member =DbService.getData(UtilityService.localDbCollection)[0];
     var getEventApi = HttpService.getMethod('Event/FetchEventbyId', {'eventId':eventObj, 'notificationId':notificationId, 'memberId':member.MemberInfo.MemberId})
     HttpService.httpCall(getEventApi).then(function(res){
       $state.go('eventdetails');
       if(res.status == 200){
         self.setEvent(res.data.ResultData);
       }else{
         console.log(res.status);
       }
     })
   }

   this.setEvent = function(eventData){
     eventData['sMonth']=eventData['StartDate'].toCustomMonth();
     eventData['sDay']=eventData['StartDate'].toCustomDay();
     eventData['sYear']=eventData['StartDate'].toCustomYear();
     eventData['eMonth']=eventData['EndDate'].toCustomMonth();
     eventData['eDay']=eventData['EndDate'].toCustomDay();
     eventData['eYear']=eventData['EndDate'].toCustomYear();
     eventData['StartTime']=eventData.StartTimeString.toCustomTime();
     eventData['EndTime']=eventData.EndTimeString.toCustomTime();
     $rootScope.showEventsDetails=eventData;
     $state.go('eventdetails');
   }

   this.updateNotificationStatus = function(notificationId){
     var updateStatus =HttpService.postMethod('Notification/UpdateNotificationStatusById?notificationId='+notificationId)
     updateStatus.showLoader = false
     HttpService.httpCall(updateStatus).then(function(res){
       console.log(res);
     })
   }

})
