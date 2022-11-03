import algosdk from "algosdk";
import {
  algodClient,
  indexerClient,
  blogNote,
  minRound,
  myAlgoConnect,
  numGlobalBytes,
  numGlobalInts,
  numLocalBytes,
  numLocalInts,
} from "./constants";
/* eslint import/no-webpack-loader-syntax: off */
import approvalProgram from "!!raw-loader!../contracts/blogger_approval.teal";
import clearProgram from "!!raw-loader!../contracts/blogger_clear.teal";
import {
  base64ToUTF8String,
  getAddress,
  utf8ToBase64String,
} from "./conversions";

class Post {
  constructor(
    creator,
    author,
    image,
    content,
    total,
    title,
    tippers,
    appId,
    owner
  ) {
    this.creator = creator;
    this.author = author;
    this.image = image;
    this.content = content;
    this.total = total;
    this.title = title;
    this.tippers = tippers;
    this.appId = appId;
    this.owner = owner;
  }
}

const compileProgram = async (programSource) => {
  let encoder = new TextEncoder();
  let programBytes = encoder.encode(programSource);
  let compileResponse = await algodClient.compile(programBytes).do();
  return new Uint8Array(Buffer.from(compileResponse.result, "base64"));
};

// CREATE post: ApplicationCreateTxn
export const createPostAction = async (senderAddress, post) => {
  console.log("Creating post...", post.author);

  let params = await algodClient.getTransactionParams().do();
  params.fee = algosdk.ALGORAND_MIN_TX_FEE;
  params.flatFee = true;

  // Compile programs
  const compiledApprovalProgram = await compileProgram(approvalProgram);
  const compiledClearProgram = await compileProgram(clearProgram);

  // Build note to identify transaction later and required app args as Uint8Arrays
  let note = new TextEncoder().encode(blogNote);
  let author = new TextEncoder().encode(post.author);
  let image = new TextEncoder().encode(post.image);
  let content = new TextEncoder().encode(post.content);
  let title = new TextEncoder().encode(post.title);

  let appArgs = [author, content, title, image];

  // Create ApplicationCreateTxn
  let txn = algosdk.makeApplicationCreateTxnFromObject({
    from: senderAddress,
    suggestedParams: params,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    approvalProgram: compiledApprovalProgram,
    clearProgram: compiledClearProgram,
    numLocalInts: numLocalInts,
    numLocalByteSlices: numLocalBytes,
    numGlobalInts: numGlobalInts,
    numGlobalByteSlices: numGlobalBytes,
    note: note,
    appArgs: appArgs,
  });

  // Get transaction ID
  let txId = txn.txID().toString();

  // Sign & submit the transaction
  let signedTxn = await myAlgoConnect.signTransaction(txn.toByte());
  console.log("Signed transaction with txID: %s", txId);
  await algodClient.sendRawTransaction(signedTxn.blob).do();

  // Wait for transaction to be confirmed
  let confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);

  // Get the completed Transaction
  console.log(
    "Transaction " +
      txId +
      " confirmed in round " +
      confirmedTxn["confirmed-round"]
  );

  // Get created application id and notify about completion
  let transactionResponse = await algodClient
    .pendingTransactionInformation(txId)
    .do();
  let appId = transactionResponse["application-index"];
  console.log("Created new app-id: ", appId);
  return appId;
};

// Tip post: Group transaction consisting of ApplicationCallTxn and PaymentTxn
export const tipPostAction = async (senderAddress, post, _amount) => {
  console.log("Tipping...", senderAddress, post.appId);

  let params = await algodClient.getTransactionParams().do();
  params.fee = algosdk.ALGORAND_MIN_TX_FEE;
  params.flatFee = true;

  // Build required app args as Uint8Array
  let tipArg = new TextEncoder().encode("tip");
  let amount = algosdk.encodeUint64(parseInt(_amount));
  let appArgs = [tipArg, amount];

  // Create ApplicationCallTxn
  let appCallTxn = algosdk.makeApplicationCallTxnFromObject({
    from: senderAddress,
    appIndex: post.appId,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams: params,
    appArgs: appArgs,
  });

  // Create PaymentTxn
  let paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: senderAddress,
    to: post.owner,
    amount: _amount,
    suggestedParams: params,
  });

  let txnArray = [appCallTxn, paymentTxn];

  // Create group transaction out of previously build transactions
  let groupID = algosdk.computeGroupID(txnArray);
  for (let i = 0; i < 2; i++) txnArray[i].group = groupID;

  // Sign & submit the group transaction
  let signedTxn = await myAlgoConnect.signTransaction(
    txnArray.map((txn) => txn.toByte())
  );
  console.log("Signed group transaction");
  let tx = await algodClient
    .sendRawTransaction(signedTxn.map((txn) => txn.blob))
    .do();

  // Wait for group transaction to be confirmed
  let confirmedTxn = await algosdk.waitForConfirmation(algodClient, tx.txId, 4);

  // Notify about completion
  console.log(
    "Group transaction " +
      tx.txId +
      " confirmed in round " +
      confirmedTxn["confirmed-round"]
  );
};

export const deletePostAction = async (senderAddress, index) => {
  console.log("Deleting application...");

  let params = await algodClient.getTransactionParams().do();
  params.fee = algosdk.ALGORAND_MIN_TX_FEE;
  params.flatFee = true;

  // Create ApplicationDeleteTxn
  let txn = algosdk.makeApplicationDeleteTxnFromObject({
    from: senderAddress,
    suggestedParams: params,
    appIndex: index,
  });

  // Get transaction ID
  let txId = txn.txID().toString();

  // Sign & submit the transaction
  let signedTxn = await myAlgoConnect.signTransaction(txn.toByte());
  console.log("Signed transaction with txID: %s", txId);
  await algodClient.sendRawTransaction(signedTxn.blob).do();

  // Wait for transaction to be confirmed
  const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);

  // Get the completed Transaction
  console.log(
    "Transaction " +
      txId +
      " confirmed in round " +
      confirmedTxn["confirmed-round"]
  );

  // Get application id of deleted application and notify about completion
  let transactionResponse = await algodClient
    .pendingTransactionInformation(txId)
    .do();
  let appId = transactionResponse["txn"]["txn"].apid;
  console.log("Deleted app-id: ", appId);
};

export const getPostsAction = async () => {
  console.log("Fetching posts...");
  let note = new TextEncoder().encode(blogNote);
  let encodedNote = Buffer.from(note).toString("base64");

  // Step 1: Get all transactions by notePrefix (+ minRound filter for performance)
  let transactionInfo = await indexerClient
    .searchForTransactions()
    .notePrefix(encodedNote)
    .txType("appl")
    .minRound(minRound)
    .do();
  let posts = [];
  for (const transaction of transactionInfo.transactions) {
    let appId = transaction["created-application-index"];
    if (appId) {
      // Step 2: Get each application by application id
      let post = await getApplication(appId);
      if (post) {
        posts.push(post);
      }
    }
  }
  console.log("posts fetched.");
  return posts;
};

const getApplication = async (appId) => {
  try {
    // 1. Get application by appId
    let response = await indexerClient
      .lookupApplications(appId)
      .includeAll(true)
      .do();
    if (response.application.deleted) {
      return null;
    }
    let globalState = response.application.params["global-state"];

    // 2. Parse fields of response and return product
    let creator = response.application.params.creator;
    let author = "";
    let image = "";
    let content = "";
    let owner = "";
    let tippers = 0;
    let total = 0;
    let title = "";

    const getField = (fieldName, globalState) => {
      return globalState.find((state) => {
        return state.key === utf8ToBase64String(fieldName);
      });
    };

    if (getField("AUTHOR", globalState) !== undefined) {
      let field = getField("AUTHOR", globalState).value.bytes;
      author = base64ToUTF8String(field);
    }

    if (getField("IMAGE", globalState) !== undefined) {
      let field = getField("IMAGE", globalState).value.bytes;
      image = base64ToUTF8String(field);
    }
    // check for blog data
    for (let i = 0; i < 11; i++) {
      let key_index = i.toString();
      if (getField(key_index, globalState) !== undefined) {
        let field = getField(key_index, globalState).value.bytes;
        content += base64ToUTF8String(field);
      }
    }

    if (getField("TIPPERS", globalState) !== undefined) {
      tippers = getField("TIPPERS", globalState).value.uint;
    }

    if (getField("TOTAL", globalState) !== undefined) {
      total = getField("TOTAL", globalState).value.uint;
    }

    if (getField("TITLE", globalState) !== undefined) {
      let field = getField("TITLE", globalState).value.bytes;
      title = base64ToUTF8String(field);
    }

    if (getField("OWNER", globalState) !== undefined) {
      let field = getField("OWNER", globalState).value.bytes;
      owner = getAddress(field);
    }

    return new Post(
      creator,
      author,
      image,
      content,
      total,
      title,
      tippers,
      appId,
      owner
    );
  } catch (err) {
    return null;
  }
};
