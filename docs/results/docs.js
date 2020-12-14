/**
 * @api {get} /results/:runId/readFile Read a Result File
 * @apiVersion 0.0.1
 * @apiGroup Results
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Read a file from the specified Run's results. <br>
 * 
 * SrcPath is a required query parameter.
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -OJ "http://<%HOSTNAME%>/api/v0/results/235/readFile?SrcPath=configs/out.csv"
 * @apiParam (Path)  {Number} RunId Unique Run Id matching a results directory.
 * @apiParam (Query) {String} SrcPath Path of of the file under /Results/RunId/ Dir
 */


/**
 * @api {post} /results/:runId/saveFile Save a Result File
 * @apiVersion 0.0.1
 * @apiGroup Results
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Save the provided file in the specified Run's results. <br>
 * 
 * Filename is a required query parameter.
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    #Optional: -H "Content-Encoding: gzip" Required if data file is gziped i.e. body.csv.gz
 *    curl "http://<%HOSTNAME%>/api/v0/results/235/saveFile?Filename=out.csv" --data-binary "@in.csv"
 * @apiParam (Path)  {Number} RunId Unique Run Id matching a results directory.
 * @apiParam (Query) {String} Filename The name of the output file in /results/:runId/uploads.
 * @apiParam (Body)  {Data} File data to save at /results/:runId/uploads
 */


/**
 * @api {post} /results/:runID Upload Result Archive
 * @apiVersion 0.0.1
 * @apiGroup Results
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Upload the provided tar archive. In order for a successful upload a few conditions must be met. <br>
 *  1. The Archive specified by RunId must not exist, if an achive needs to be updated see Save Result File in docs. <br>
 *  2. The top level Directory of your archive must be the RunId, may be simplified and formatted more in the future. <br>
 *  3. The RunId spcified in the Path must equal the top level Directory in the archive i.e. the RunId, see 2. <br>
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl "http://<%HOSTNAME%>/api/v0/results/456" --data-binary "@456.tgz"
 * @apiParam (Path)  {Number} RunId Unique Run Id matching a results directory.
 * @apiParam (Body)  {Data} tararchive tar archive data, gzip is optional.
 */


/**
 * @api {get} /results/:runID Download Result Archives
 * @apiVersion 0.0.1
 * @apiGroup Results
 * @apiPermission <%USER_ROLE%>
 * @apiDescription  Download the specified Results Archive or a branch of it
 * using the SrcPath query param. The data is returned in tar.gz format.
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    #-OJ is a killer option that uses content-disposition header as the output file name.
 *    #It Requires The "http://" protocol prefix to succeed!!!
 *    #this is determined automatically by the api as follows.
 *    #
 *    # Whole Archive 235/...
 *    curl -OJ "http://<%HOSTNAME%>/api/v0/results/235"
 *    # => 235.tgz
 *    #
 *    # Everything under the 235/config/...
 *    curl -OJ "http://<%HOSTNAME%>/api/v0/results/235?SrcPath=config"
 *    # => 235-config.tgz
 *    #
 *    # Everything under 235/config/TestCases/...
 *    curl -OJ "http://<%HOSTNAME%>/api/v0/results/235?SrcPath=config/TestCases"
 *    # => 235-TestCases.tgz
 *    #
 *    # Single File  235/config/TestCases/blahfile.txt
 *    curl -OJ "http://<%HOSTNAME%>/api/v0/results/235?SrcPath=config/TestCases/blahfile.txt"
 *    # => 235-blahfile.txt.tgz
 * @apiParam (Query) {String} [SrcPath] Path of of the sub-directory or file under /Results/:runId/ Dir
 */


/**
 * @api {get} /results/:runId/list List Results Archive
 * @apiVersion 0.0.1
 * @apiGroup Results
 * @apiPermission <%USER_ROLE%>
 * @apiDescription Get a list of all file paths within a result's archive.
 * @apiExample {curl} Example usage:
 *    #Optional: -H "Authorization: Basic ***"
 *    curl -X GET "http://<%HOSTNAME%>/api/v0/results/:runId/list"
 * @apiParam (Path)  {Number} RunId Unique Run Id matching a results directory.
 */
