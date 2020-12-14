/**
 * @api {get} /info Get API Info 
 * @apiVersion 0.0.1
 * @apiGroup Info
 * @apiPermission none
 * @apiDescription Get Api Information.
 * @apiExample {curl} Example usage:
 *    curl -X GET "http://<%HOSTNAME%>/api/v0/info"
 */

/**
 * @api {post} /run Insert Run 
 * @apiVersion 0.0.1
 * @apiGroup Runs
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Create a new Run from the fields provided in the body. <br>
 *  1. TestCase is required in the body. <br>
 *  2. RunID is not allowed in the body.
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -H "Content-Type: application/json" \
 *            "http://<%HOSTNAME%>/api/v0/run" -d "@body.json"
 * @apiParam (JSON Body) {String} [Results=NULL] Results of the Run 
 * @apiParam (JSON Body) {String} [Datetime='UTC NOW'] Date the Run was ran (yyyy-mm-dd HH:MM:ss)
 * @apiParam (JSON Body) {Number} [DurationHrs=NULL] Duration of the Run 
 * @apiParam (JSON Body) {String} [StationName] Station the Run is ran on 
 * @apiParam (JSON Body) {String="VLAB","PreProd","VPreProd"} [StationType=NULL] The type of the station
 * @apiParam (JSON Body) {String} [RunName] The name of the Run 
 * @apiParam (JSON Body) {String} TestCase The test case used by this Run 
 * @apiParam (JSON Body) {String} [TestExecServer=NULL] TBD
 * @apiParam (JSON Body) {String} [SAMRunMode=NULL] TBD
 * @apiParam (JSON Body) {String} [SAMTestCase=NULL] TBD
 * @apiParam (JSON Body) {String} [Description=NULL] A description of the Run 
 * @apiParam (JSON Body) {String="pass","FAIL","unverified"} [Result=NULL] Whether the Run Passed or Failed
 * @apiParam (JSON Body) {String} [Notes=NULL] Notes about the Run 
 * @apiParam (JSON Body) {String} [User] Who started the Run 
 * @apiParam (JSON Body) {String="complete","running","invalid"} [Status=NULL] Current Status of the test run
 * @apiParam (JSON Body) {Number} [LinkedSet=NULL] TBD
 * @apiParam (JSON Body) {String} [TestPlan=NULL] JAMA Test Plan
 * @apiParam (JSON Body) {String} [TestCycle=NULL] JAMA Test Cycle
 * @apiParam (JSON Body) {Number} [JamaId=NULL] JAMA Id
 * @apiParam (JSON Body) {String} [CleanupDatetime=NULL] TBD
 * @apiParam (JSON Body) {String} [JenkinsJob=NULL] Jekins Job url of the test run 
 */


/**
 * @api {post} /run/:RunID Update Run
 * @apiVersion 0.0.1
 * @apiGroup Runs
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Update the specified Run with the provided body fields. <br> 
 *  1. The body must have at least one field to update. <br>
 *  2. RunID is not allowed in the body.
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -H "Content-Type: application/json" \ 
 *            "http://<%HOSTNAME%>/api/v0/run/567" -d "@body.json"
 * @apiParam (Path)      {String} RunID Unique Run Id 
 * @apiParam (JSON Body) {String} [Results] Results of the Run 
 * @apiParam (JSON Body) {String} [Datetime] Date the Run was ran (yyyy-mm-dd HH:MM:ss)
 * @apiParam (JSON Body) {Number} [DurationHrs] Duration of the Run 
 * @apiParam (JSON Body) {String} [StationName] Station the Run is ran on 
 * @apiParam (JSON Body) {String="VLAB","PreProd","VPreProd"} [StationType] The type of the station
 * @apiParam (JSON Body) {String} [RunName] The name of the Run 
 * @apiParam (JSON Body) {String} [TestCase] The test case used by this Run 
 * @apiParam (JSON Body) {String} [TestExecServer] TBD
 * @apiParam (JSON Body) {String} [SAMRunMode] TBD
 * @apiParam (JSON Body) {String} [SAMTestCase] TBD
 * @apiParam (JSON Body) {String} [Description] Description of the Run 
 * @apiParam (JSON Body) {String="pass","FAIL","unverified"} [Result] Whether the Test Run Passed or Failed
 * @apiParam (JSON Body) {String} [Notes] Notes about the Run 
 * @apiParam (JSON Body) {String} [User] Who started the Run 
 * @apiParam (JSON Body) {String="complete","running","invalid"} [Status] Current Status of the Run
 * @apiParam (JSON Body) {Number} [LinkedSet] TBD
 * @apiParam (JSON Body) {String} [TestPlan] JAMA Test Plan
 * @apiParam (JSON Body) {String} [TestCycle] JAMA Test Cycle
 * @apiParam (JSON Body) {Number} [JamaId] JAMA Id 
 * @apiParam (JSON Body) {String} [CleanupDatetime] TBD
 * @apiParam (JSON Body) {String} [JenkinsJob] Jekins Job url of the test run 
 */


/**
 * @api {get} /runs Get Runs
 * @apiVersion 0.0.1
 * @apiGroup Runs
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Retrieve Runs matching the following query parameters.
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -X GET "http://<%HOSTNAME%>/api/v0/runs?TestCase=MAC%20CAT"
 * @apiParam (Query) {Number} [RunID] Unique Run Id 
 * @apiParam (Query) {String} [RunName] The name of the Run 
 * @apiParam (Query) {String} [StationName] Station the Run is ran on 
 * @apiParam (Query) {String} [Datetime] Date the Run was ran 
 * @apiParam (Query) {String} [Results] Results of the Run 
 * @apiParam (Query) {Number} [DurationHrs] Duration of the Run 
 * @apiParam (Query) {String="VLAB","PreProd","VPreProd"} [StationType] The type of the station
 * @apiParam (Query) {String} [TestCase] The test case used by this Run 
 * @apiParam (Query) {String} [TestExecServer] TBD
 * @apiParam (Query) {String} [SAMRunMode] TBD
 * @apiParam (Query) {String} [SAMTestCase] TBD
 * @apiParam (Query) {String} [Description] Description of the Run 
 * @apiParam (Query) {String="pass","FAIL","unverified"} [Result] Whether the Run Passed or Failed
 * @apiParam (Query) {String} [Notes] Notes about the Run
 * @apiParam (Query) {String} [User] Who started the Run 
 * @apiParam (Query) {String="complete","running","invalid"} [Status] Current Status of the test run
 * @apiParam (Query) {Number} [LinkedSet] TBD
 * @apiParam (Query) {String} [TestPlan] JAMA Test Plan
 * @apiParam (Query) {String} [TestCycle] JAMA Test Cycle
 * @apiParam (Query) {Number} [JamaId] JAMA Id 
 * @apiParam (Query) {String} [CleanupDatetime] TBD
 * @apiParam (Query) {String} [JenkinsJob] Jekins Job url of the Run 
 */


/**
 * @api {post} /runPlan Insert Run Plan
 * @apiVersion 0.0.1
 * @apiGroup Run Plans
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Create a new Run Plan from the fields provided in the body. <br>
 *  1. Plan and TestCase are required in the body. <br>
 *  2. PlanId is not allowed in the body. <br>
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -H "Content-Type: application/json" \
 *            "http://<%HOSTNAME%>/api/v0/runPlan" -d "@body.json"
 * @apiParam (JSON Body) {String} Plan The name of the RunPlan 
 * @apiParam (JSON Body) {String} [PlanDescription] Description of the Run Plan
 * @apiParam (JSON Body) {String} TestCase Name of the TestCase this Run Plan tracks
 * @apiParam (JSON Body) {String} [Description] Description of the TestCase this Run Plan tracks
 * @apiParam (JSON Body) {String} [Timestamp='UTC NOW'] Date the Run Plan was created (yyyy-mm-dd HH:MM:ss)
 */


/**
 * @api {post} /runPlan/:PlanId Update Run Plan
 * @apiVersion 0.0.1
 * @apiGroup Run Plans
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Update the specified Run Plan with the provided body fields. <br> 
 *  1. The body must have at least one field to update. <br>
 *  2. PlanId is not allowed in the body.
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -H "Content-Type: application/json" \ 
 *            "http://<%HOSTNAME%>/api/v0/runPlan/567" -d "@body.json"
 * @apiParam (Path)      {String} PlanId Unique Run Plan Id 
 * @apiParam (JSON Body) {String} [Plan] The name of the Run Plan 
 * @apiParam (JSON Body) {String} [PlanDescription] Description of the Run Plan
 * @apiParam (JSON Body) {String} [TestCase] Name of the TestCase this Run Plan tracks
 * @apiParam (JSON Body) {String} [Description] Description of the TestCase this Run Plan tracks
 * @apiParam (JSON Body) {String} [Timestamp='UTC NOW'] Date the Run Plan was created (yyyy-mm-dd HH:MM:ss)
 */


/**
 * @api {get} /runPlans Get Run Plans
 * @apiVersion 0.0.1
 * @apiGroup Run Plans
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Retrieve Run Plans matching the following query parameters. <br>
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -X GET "http://<%HOSTNAME%>/api/v0/runPlans?plan=AB%20PAT"
 * @apiParam (Query) {Number} [PlanId] Unique Run Plan Id
 * @apiParam (Query) {String} [Plan] The name of the Run Plan
 * @apiParam (Query) {String} [PlanDescription] Description of the Run Plan
 * @apiParam (Query) {String} [TestCase] Name of the TestCase this Run Plan plan tracks
 * @apiParam (Query) {String} [Description] Description of the TestCase this Run Plan tracks
 * @apiParam (Query) {String} [Timestamp='UTC NOW'] Date the Run Plan was created (yyyy-mm-dd HH:MM:ss)
 */


/**
 * @api {delete} /runPlan/:PlanId Delete Run Plan
 * @apiVersion 0.0.1
 * @apiGroup Run Plans
 * @apiPermission <%ADMIN_ROLE%>
 * @apiDescription Delete the specified Run Plan and associated Run Plan Links.<br>
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -X DELETE "http://<%HOSTNAME%>/api/v0/runPlan/7"
 * @apiParam (Path) {Number} PlanId Unique Run Plan Id.
 */


/**
 * @api {post} /stepPlan Insert Step Plan
 * @apiVersion 0.0.1
 * @apiGroup Step Plans
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Create a new Step Plan from the fields provided in the body. <br>
 *  1. Plan and ScriptName are required in the body. <br>
 *  2. PlanId is not allowed in the body.
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -H "Content-Type: application/json" \
 *            "http://<%HOSTNAME%>/api/v0/stepPlan" -d "@body.json"
 * @apiParam (JSON Body) {String} Plan The name of the Step Plan 
 * @apiParam (JSON Body) {String} [PlanDescription] Description of the Step Plan
 * @apiParam (JSON Body) {String} ScriptName Name of the Script this Step Plan tracks
 * @apiParam (JSON Body) {String} [Description] Description of the Script this Step Plan tracks
 * @apiParam (JSON Body) {String} [ParamFile] TBD
 * @apiParam (JSON Body) {String} [Timestamp='UTC NOW'] Date the Run Plan was created (yyyy-mm-dd HH:MM:ss)
 */


/**
 * @api {post} /stepPlan/:PlanId Update Step Plan
 * @apiVersion 0.0.1
 * @apiGroup Step Plans
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Update the specified Step Plan with the provided body fields. <br> 
 *  1. The body must have at least one field to update. <br>
 *  2. PlanId is not allowed in the body. <br>
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -H "Content-Type: application/json" \ 
 *            "http://<%HOSTNAME%>/api/v0/stepPlan/567" -d "@body.json"
 * @apiParam (Path)      {String} PlanId Unique Step Plan Id 
 * @apiParam (JSON Body) {String} [Plan] The name of the Step Plan 
 * @apiParam (JSON Body) {String} [PlanDescription] Description of the Step Plan
 * @apiParam (JSON Body) {String} [ScriptName] Name of the Script this Step Plan tracks
 * @apiParam (JSON Body) {String} [Description] Description of the TestCase this Run Plan tracks
 * @apiParam (JSON Body) {String} [ParamFile] TBD
 * @apiParam (JSON Body) {String} [Timestamp='UTC NOW'] Date the Run Plan was created (yyyy-mm-dd HH:MM:ss)
 */


/**
 * @api {get} /stepPlans Get Step Plans
 * @apiVersion 0.0.1
 * @apiGroup Step Plans
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Retrieve Step Plans matching the following query parameters. <br>
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -X GET "http://<%HOSTNAME%>/api/v0/stepPlans?plan=AB%20PAT"
 * @apiParam (Query) {Number} [PlanId] Unique Step Plan Id
 * @apiParam (Query) {String} [Plan] The name of the Step Plan
 * @apiParam (Query) {String} [PlanDescription] Description of the Step Plan
 * @apiParam (Query) {String} [Scriptname] Name of the TestCase this Step Plan tracks
 * @apiParam (Query) {String} [Description] Description of the Script this Step Plan tracks
 * @apiParam (Query) {String} [ParamFile] TBD 
 * @apiParam (Query) {String} [Timestamp='UTC NOW'] Date the Run Plan was created (yyyy-mm-dd HH:MM:ss)
 */


/**
 * @api {delete} /stepPlan/:PlanId Delete Step Plan
 * @apiVersion 0.0.1
 * @apiGroup Step Plans
 * @apiPermission <%ADMIN_ROLE%>
 * @apiDescription Delete the specified Step Plan and associated Step Plan Links
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -X DELETE "http://<%HOSTNAME%>/api/v0/stepPlan/7"
 * @apiParam (Path) {Number} PlanId Unique Step Plan Id.
 */


/**
 * @api {post} /runPlanLink Insert Run Plan Link
 * @apiVersion 0.0.1
 * @apiGroup Run Plan Links
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Create a new Run Plan Link for the specified Run Plan with fields provided in the body. <br>
 *  1. LinkUrl and RunPlanId are required in the body. <br>
 *  2. LinkId is not allowed in the body. <br>
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -H "Content-Type: application/json" \
 *            "http://<%HOSTNAME%>/api/v0/runPlanLink" -d "@body.json"
 * @apiParam (JSON Body) {Number} RunPlanId Id of an existing Run Plan.
 * @apiParam (JSON Body) {String} [Link] Name to use for the Link in Html.
 * @apiParam (JSON Body) {String} LinkUrl The Link.
 * @apiParam (JSON Body) {String} [AltTestCase] Alternate Test Case associated with this link.
 */


/**
 * @api {post} /runPlanLink/:LinkId Update Run Plan Link
 * @apiVersion 0.0.1
 * @apiGroup Run Plan Links
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Update the specified link with fields provided in the body. <br>
 *  1. The body must have at least one field to update. <br>
 *  2. LinkId and RunPlanId are not allowed in the body. <br>
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -H "Content-Type: application/json" \
 *            "http://<%HOSTNAME%>/api/v0/runPlanLink/10" -d "@body.json"
 * @apiParam (Path) {String} LinkId Id of an existing Run Plan Link.
 * @apiParam (JSON Body) {String} [Link] Name to use for the Link in Html.
 * @apiParam (JSON Body) {String} [LinkUrl] The Link.
 * @apiParam (JSON Body) {String} [AltTestCase] Alternate Test Case associated with this link.
 */


/**
 * @api {get} /runPlanLinks Get Run Plan Links
 * @apiVersion 0.0.1
 * @apiGroup Run Plan Links
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Retrieve  Plan Links matching the following query parameters.
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -X GET "http://<%HOSTNAME%>/api/v0/runPlanLinks?RunPlanId=37"
 * @apiParam (Query) {Number} [LinkId] Unique Id of the Link 
 * @apiParam (Query) {Number} [RunPlanId] Unique Run Plan the Link belongs too.
 * @apiParam (Query) {String} [Link] The name of the Link in HTML.
 * @apiParam (Query) {String} [LinkUrl] The Link.
 * @apiParam (Query) {String} [AltTestCase] Alternate Test Case associated with this link.
 */


/**
 * @api {delete} /runPlanLinks Delete Run Plan Links
 * @apiVersion 0.0.1
 * @apiGroup Run Plan Links
 * @apiPermission <%ADMIN_ROLE%>
 * @apiDescription Delete the Run Plan Links associated with the Specified Run Plan<br>
 * 1. RunPlanId or LinkId are required query parameters. 
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -X DELETE "http://<%HOSTNAME%>/api/v0/runPlanLinks?RunPlanId=7"
 * @apiParam (Query) {Number} RunPlanId Unique Run Plan Id.
 * @apiParam (Query) {Number} LinkId Unique Run Plan Id.
 * @apiParam (Query) {String} [Link] The name of the Link in HTML. 
 * @apiParam (Query) {String} [LinkUrl] The Link. 
 * @apiParam (Query) {String} [AltTestCase] Alternate Test Case associated with this link.
 */


/**
 * @api {post} /stepPlanLink Insert Step Plan Link
 * @apiVersion 0.0.1
 * @apiGroup Step Plan Links
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Create a new Step Plan Link for the specified Step Plan with fields provided in the body. <br>
 *  1. LinkUrl and StepPlanId are required in the body. <br>
 *  2. LinkId is not allowed in the body. <br>
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -H "Content-Type: application/json" \
 *            "http://<%HOSTNAME%>/api/v0/stepPlanLink" -d "@body.json"
 * @apiParam (JSON Body) {Number} StepPlanId Id of an existing Step Plan.
 * @apiParam (JSON Body) {String} [Link] Name to use for the Link in Html.
 * @apiParam (JSON Body) {String} LinkUrl The Link.
 * @apiParam (JSON Body) {String} [AltTestCase] Alternate Test Case associated with this link.
 */


/**
 * @api {post} /stepPlanLink/:LinkId Update Step Plan Link
 * @apiVersion 0.0.1
 * @apiGroup Step Plan Links
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Update the specified link with fields provided in the body. <br>
 *  1. The body must have at least one field to update. <br>
 *  2. LinkId and StepPlanId are not allowed in the body. <br>
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -H "Content-Type: application/json" \
 *            "http://<%HOSTNAME%>/api/v0/stepPlanLink/7" -d "@body.json"
 * @apiParam (Path) {String} LinkId Id of an existing Step Plan Link.
 * @apiParam (JSON Body) {String} [Link] Name to use for the Link in Html.
 * @apiParam (JSON Body) {String} [LinkUrl] The Link.
 * @apiParam (JSON Body) {String} [AltTestCase] Alternate Test Case associated with this link.
 */


/**
 * @api {get} /stepPlanLinks Get Step Plan Links
 * @apiVersion 0.0.1
 * @apiGroup Step Plan Links
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Retrieve Step Plan Links matching the following query parameters.
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -X GET "http://<%HOSTNAME%>/api/v0/stepPlanLinks?StepPlanId=37"
 * @apiParam (Query) {Number} [LinkId] Unique Id of the Link 
 * @apiParam (Query) {Number} [StepPlanId] Unique Step Plan the Link belongs too. 
 * @apiParam (Query) {String} [Link] The name of the Link in HTML. 
 * @apiParam (Query) {String} [LinkUrl] The Link. 
 * @apiParam (Query) {String} [AltTestCase] Alternate Test Case associated with this link.
 */


/**
 * @api {delete} /stepPlanLinks Delete Step Plan Links
 * @apiVersion 0.0.1
 * @apiGroup Step Plan Links
 * @apiPermission <%ADMIN_ROLE%>
 * @apiDescription Delete the Step Plan Links associated with the Specified Step Plan<br>
 * 1. StepPlanId or LinkId are required query parameters.
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -X DELETE "http://<%HOSTNAME%>/api/v0/stepPlanLinks/9?AltTestCase=AB-TC-1"
 * @apiParam (Query) {Number} StepPlanId Associated Step Plan Id.
 * @apiParam (Query) {Number} LinkId Unique Link Id.
 * @apiParam (Query) {String} [Link] The name of the Link in HTML. 
 * @apiParam (Query) {String} [LinkUrl] The Link. 
 * @apiParam (Query) {String} [AltTestCase] Alternate Test Case associated with this link.
 */


/**
 * @api {post} /run/:RunID/step Insert Step
 * @apiVersion 0.0.1
 * @apiGroup Steps
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Create a new Step for the specified Run. <br>
 *  1. ScriptName is required in the body. <br>
 *  2. RunID and StepID never allowed in the body.
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -H "Content-Type: application/json" \
 *            "http://<%HOSTNAME%>/api/v0/run/567/step" -d "@body.json"
 * @apiParam (Path)      {Number} RunID Unique Run Id
 * @apiParam (JSON Body) {String="complete","running","invalid"} [Status=NULL] Current Status of the Step
 * @apiParam (JSON Body) {String} [Datetime='UTC NOW'] Date the Step was ran (yyyy-mm-dd HH:MM:ss)
 * @apiParam (JSON Body) {Number} [DurationHrs=NULL] Duration of the Step 
 * @apiParam (JSON Body) {String} [TestCase=NULL] The test case this Step belongs too
 * @apiParam (JSON Body) {String} ScriptName=NULL The test script executed by this Step 
 * @apiParam (JSON Body) {String} [ConfigFile=NULL] TBD
 * @apiParam (JSON Body) {String="pass","FAIL","unverified"} [Result=NULL] Whether the Run Passed or Failed
 * @apiParam (JSON Body) {String} [Notes=NULL] Notes about the Step 
 */


/**
 * @api {post} /run/:RunID/step/:StepID Update Step 
 * @apiVersion 0.0.1
 * @apiGroup Steps 
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Update the specified Step with the fields provided in the body. <br>
 *  1. The body must have at least one field to update. <br>
 *  2. RunID and StepID are not allowed in the body.
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -H "Content-Type: application/json" \
 *            "http://<%HOSTNAME%>/api/v0/run/567/step/1" -d "@body.json"
 * @apiParam (Path)      {Number} RunID Unique Run ID
 * @apiParam (Path)      {Number} StepID Ordered(1,2,...) Step ID 
 * @apiParam (JSON Body) {String="complete","running","invalid"} [Status] Current Status of the Step
 * @apiParam (JSON Body) {String} [Datetime] Date the Step was run (yyyy-mm-dd HH:MM:ss)
 * @apiParam (JSON Body) {Number} [DurationHrs] Duration of the Step 
 * @apiParam (JSON Body) {String} [TestCase] The test case this Step belongs too
 * @apiParam (JSON Body) {String} [ScriptName] The test script executed by this Step 
 * @apiParam (JSON Body) {String} [ConfigFile] TBD
 * @apiParam (JSON Body) {String="pass","FAIL","unverified"} [Result] Whether the Run Passed or Failed
 * @apiParam (JSON Body) {String} [Notes=NULL] Notes about the Step
 */


/**
 * @api {get} /steps Get Steps
 * @apiVersion 0.0.1
 * @apiGroup Steps
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Retrieve Steps matching the following query parameters.
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -X GET "http://<%HOSTNAME%>/api/v0/steps?TestCase=PlaylistPush"
 * @apiParam (Query) {Number} [RunID] Unique Run ID
 * @apiParam (Query) {Number} [StepID] Ordered(1,2,...) Step ID
 * @apiParam (Query) {String="complete","running","invalid"} [Status] Current Status of the Step
 * @apiParam (Query) {String} [Datetime] Date the Step was run (yyyy-mm-dd HH:MM:ss)
 * @apiParam (Query) {Number} [DurationHrs] Duration of the Step
 * @apiParam (Query) {String} [TestCase] The test case this Step belongs too
 * @apiParam (Query) {String} [ScriptName] The test script executed by this Step
 * @apiParam (Query) {String} [ConfigFile] TBD
 * @apiParam (Query) {String="pass","FAIL","unverified"} [Result] Whether the Run Passed or Failed
 * @apiParam (Query) {String} [Notes] Notes about the Step
 */


/**
 * @api {post} /run/:RunID/verificationPoint Insert Run Verification Point
 * @apiVersion 0.0.1
 * @apiGroup Verification Points
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Create a new Verification point for the specified Run. <br>
 *  1. Name and Result are required in the body. <br>
 *  2. RunID, and id are not allowed in the body.
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -H "Content-Type: application/json" \
 *            "http://<%HOSTNAME%>/api/v0/run/567/verificationPoint" -d "@body.json"
 * @apiParam (Path)      {Number} RunID Unique Run ID
 * @apiParam (JSON Body) {String} [SetID=NULL] Set Id referencing a set of Attributes.
 * @apiParam (JSON Body) {String} Name Name of the Verification Point.
 * @apiParam (JSON Body) {String} [Datetime='UTC NOW'] Date the Verification Point was recorded (yyyy-mm-dd HH:MM:ss).
 * @apiParam (JSON Body) {String} [Type=NULL] Type of the Verification Point.
 * @apiParam (JSON Body) {String} [ExpectedValue=NULL] What the Verification Point result is expected to be.
 * @apiParam (JSON Body) {String} [Operator=NULL] Operator used in the verification.
 * @apiParam (JSON Body) {String} [ResultValue=NULL] Actual Verfication Point result.
 * @apiParam (JSON Body) {String="PASS","FAIL","unverified"} Result Was the verification successful.
 */


/**
 * @api {post} /run/:RunID/step/:StepID/verificationPoint Insert Step Verification Point
 * @apiVersion 0.0.1
 * @apiGroup Verification Points
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Create a new Verification point for the specified Step. <br>
 *  1. Name and Result are required in the body. <br>
 *  2. RunID, StepID, and id are not allowed in the body.
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -H "Content-Type: application/json" \
 *            "http://<%HOSTNAME%>/api/v0/run/567/step/1/verificationPoint" -d "@body.json"
 * @apiParam (Path)      {Number} RunID Unique Run ID
 * @apiParam (Path)      {Number} StepID Ordered(1,2,...) Step ID 
 * @apiParam (JSON Body) {String} [SetID=NULL] Set Id referencing a set of Attributes.
 * @apiParam (JSON Body) {String} Name Name of the Verification Point.
 * @apiParam (JSON Body) {String} [Datetime='UTC NOW'] Date the Verification Point was recorded (yyyy-mm-dd HH:MM:ss).
 * @apiParam (JSON Body) {String} [Type=NULL] Type of the Verification Point.
 * @apiParam (JSON Body) {String} [ExpectedValue=NULL] What the Verification Point result is expected to be.
 * @apiParam (JSON Body) {String} [Operator=NULL] Operator used in the verification.
 * @apiParam (JSON Body) {String} [ResultValue=NULL] Actual Verfication Point result.
 * @apiParam (JSON Body) {String="PASS","FAIL","unverified"} Result Was the verification successful.
 */


/**
 * @api {get} /verificationPoints Get Verification Points
 * @apiVersion 0.0.1
 * @apiGroup Verification Points 
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Retrieve Verification Points matching query parameters.
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -X GET "http://<%HOSTNAME%>/api/v0/verificationPoints?Name=TopComplete"
 * @apiParam (Query) {Number} [id] Unique verification point id 
 * @apiParam (Query) {Number} [RunID] Group the verification point belongs to
 * @apiParam (Query) {Number} [StepID] Test the verification point was recorded during 
 * @apiParam (Query) {String} [SetID] Set Id referencing a set of Attributes.
 * @apiParam (Query) {String} [Name] Name of the verification point 
 * @apiParam (Query) {String} [Datetime] Date the verification point was recorded (yyyy-mm-dd HH:MM:ss)
 * @apiParam (Query) {String} [Type] Type of the verification point
 * @apiParam (Query) {String} [ExpectedValue] What the verification point result is expected to be 
 * @apiParam (Query) {String} [Operator] Operator used in the verification 
 * @apiParam (Query) {String} [ResultValue] Actual verfication point result
 * @apiParam (Query) {String="pass","FAIL","unverified"} [Result] Was the verification successful
 */


/**
 * @api {post} /run/:RunID/versionInfo Insert Version Info 
 * @apiVersion 0.0.1
 * @apiGroup Version Info
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Create new Version Info for a Run. <br>
 *  1. Name and Type are required in the body. <br>
 *  2. RunID is not allowed in the body.
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -H "Content-Type: application/json" \
 *            "http://<%HOSTNAME%>/api/v0/run/567/versionInfo" -d "@body.json"
 * @apiParam (Path)      {Number} RunID Unique Run Id
 * @apiParam (JSON Body) {String} Name Component name or source of the version (hostname, ip, or file) 
 * @apiParam (JSON Body) {String} Type Component type (aaa, dhcp, vasn, ut, git_commit, etc) 
 * @apiParam (JSON Body) {String} [Version=NULL] Version string 
 * @apiParam (JSON Body) {String} [vCMDB=NULL] vCMDB Version string 
 */


/**
 * @api {get} /versionInfo Get Version Info
 * @apiVersion 0.0.1
 * @apiGroup Version Info
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Retrieve Version Info matching query parameters.
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 * @apiParam (Query) {Number} [RunID] Unique Run Id
 * @apiParam (Query) {String} [Name] Component name or source of the version (hostname, ip, or file) 
 * @apiParam (Query) {String} [Type] Component type (aaa, dhcp, vasn, ut, git_commit, etc) 
 * @apiParam (Query) {String} [Version] Version string 
 */

/**
 * @api {post} /run/:RunID/step/:StepID/attributes Insert Attributes
 * @apiVersion 0.0.1
 * @apiGroup Attributes
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Create new Attributes. <br>
 *  1. Name and Value are required in the body. <br>
 *  2. RunID and StepID are not allowed in the body.
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -H "Content-Type: application/json" \
 *            "http://<%HOSTNAME%>/api/v0/run/567/step/1/attributes" -d "@body.json"
 * @apiParam (Path)      {Number} RunID Unique Run ID
 * @apiParam (Path)      {Number} StepID Step ID
 * @apiParam (JSON Body) {Number} [SetID=NULL] Set Id
 * @apiParam (JSON Body) {String} Name Name of the Attribute
 * @apiParam (JSON Body) {String} Value Value of the Attribute
 */


/**
 * @api {get} /attributes Get Attributes 
 * @apiVersion 0.0.1
 * @apiGroup Attributes
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Retrieve Attributes matching query parameters.
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -X GET "http://<%HOSTNAME%>/api/v0/attributes?RunID=12&StepID=1"
 * @apiParam (Query) {Number} [RunID] Unique Run Id
 * @apiParam (Query) {Number} [StepID] Step Id
 * @apiParam (Query) {Number} [SetID] Set Id
 * @apiParam (Query) {String} [Name] Name of the Attribute
 * @apiParam (Query) {String} [Value] Value of the Attribute
 */


/**
 * @api {post} /metric Insert Metric 
 * @apiVersion 0.0.1
 * @apiGroup Metrics
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Create a new Metric. <br>
 *  1. Component, Process, Type, and Metric are required in the body.
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -H "Content-Type: application/json" \
 *            "http://<%HOSTNAME%>/api/v0/metric" -d "@body.json"
 * @apiParam (JSON Body) {Number} [RunID=NULL] Unique Run Id.
 * @apiParam (JSON Body) {Number} [StepID=NULL] Step Id.
 * @apiParam (JSON Body) {Number} [SetID=NULL] Set Id.
 * @apiParam (JSON Body) {String} Component The component the metric is supporting
 * @apiParam (JSON Body) {String} Process The process being measured
 * @apiParam (JSON Body) {String} [Context1] Info String
 * @apiParam (JSON Body) {String} [Context2] Info String
 * @apiParam (JSON Body) {String} [Timestamp='UTC NOW'] Date the Metric was measured (yyyy-mm-dd HH:MM:ss)
 * @apiParam (JSON Body) {String} Type The type of metric ('elapsed_time') 
 * @apiParam (JSON Body) {Number} Metric The actual measurment 
 */


/**
 * @api {get} /metrics Get Metrics 
 * @apiVersion 0.0.1
 * @apiGroup Metrics
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Retrieve Metrics matching query parameters. <br>
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -X GET "http://<%HOSTNAME%>/api/v0/metrics?Component=VenomApi&Process=create_network"
 * @apiParam (Query) {Number} [RunID] Unique Run Id.
 * @apiParam (Query) {Number} [StepID] Step Id.
 * @apiParam (Query) {Number} [SetID] Set Id.
 * @apiParam (Query) {String} [Component] The component the metric is supporting
 * @apiParam (Query) {String} [Process] The process being measured
 * @apiParam (Query) {String} [Context1] Info String
 * @apiParam (Query) {String} [Context2] Info String
 * @apiParam (Query) {String} [Timestamp] Time the metric was recorded (yyyy-mm-dd HH:MM:ss)
 * @apiParam (Query) {String} [Type] The type of metric i.e. 'elapsed_time'
 * @apiParam (Query) {Number} [Metric] The actual measurment 
 */


/**
 * @apiIgnore Private route
 * @api {get} /search/:resource Search Resource 
 * @apiVersion 0.7.0
 * @apiGroup Search 
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Retrieve Results from the specified Reda resource matching the following query parameters. <br>
 * For a full list of keys for each filter see their associated Get Request Docs.<br>
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -X GET 'http://<%HOSTNAME%>/api/v0/search/runs?query=\{"runs":\[\["runname","LIKE","pat","OR"\]\]\}'
 * @apiParam (Param) {String="RunPlans","StepPlans","RunPlanLinks","StepPlanLinks","Runs","Steps","VerificationPoints","VersionInfo"} resource ReDa Resource to Search 
 * @apiParam (Query) {String} [query='{}'] Json formated query string
 * @apiParam (Query) {Number} [start=0] Index to start retrieving rows from 
 * @apiParam (Query) {Number} [count=5000] Total Number of rows to return
 * @apiParamExample {json} Example Query Json Before Stringify:
 * #
 * # In the filters certain resources  use an abbreviation for example,
 * # RunPlanLinks => rpl, see below for explanations.
 * #
 * # Filter List Format: resource: [ [0,1,2,3,[4]], [0,1,2,3,[4]], [0,1,2,3,[4]] ]
 * #
 * # Filter Position 0: Mysql Column Name (Runname, TestCase, Scriptname. etc...)
 * # Filter Position 1: Mysql binary comparison opperations,
 * #        (LIKE, NOT LIKE, IS, IS NOT, <, >, <=, >=, =, !=, <>, RLIKE, REGEXP, NOT REGEXP, NOT RLIKE)
 * # Filter Position 2: Mysql Column Value
 * # Filter Position 3: Mysql logical opperations (AND, &&, OR, ||, XOR)
 * # Filter Position 4: In any filter can be used to start/end a grouping respectively by simply setting it
 * #        runs: [["Runname","=","PAT","AND",1],["TestCase","=","PAT_2","OR",1],["RunID","=",1,"AND"]] =>
 * #        (Runname = PAT AND TestCase = PAT_2) OR RunID = 1
 * #
 * # If distinct and select attributes are provided the distinct attributes are used.
 * #
 * query = {
 *     distinct: ["stationtype"],
 *     select: ["stationtype"],
 *     order: "ASC|DESC|asc|desc", # defaults to ASC
 *     runs:  [["runname","LIKE","pat","OR"],["runId","<",10,"AND"]],
 *     steps: [["scriptname","LIKE","Wait.tcl","AND"],["stepId","<",10,"OR",1],["TestCase","=","CAT","OR",1]],
 *     vps:   [["result","=","FAIL","OR"]],
 *     vers:  [["version","LIKE","6065-0","OR"],["Type","=","ut-tools","AND"]],
 *     rps:  [["plan","LIKE","AB PAT","OR"],["TestCase","=","PAT","AND"]],
 *     sps:  [["plan","LIKE","AB PAT","OR"],["Scriptname","=","Wait.tcl","AND"]]
 *     rpl:  [["Link","LIKE","PAT","OR"],["LinkUrl","=","jama.com","AND"]]
 *     spl:  [["Link","LIKE","AB-TC-1","OR"],["LinkUrl","=","jama.com","AND"]]
 * }
 */
