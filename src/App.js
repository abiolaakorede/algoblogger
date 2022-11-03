import "./App.css";
import Head from "./components/Head";
import Hero from "./components/Hero";
import Main from "./components/Main";
import Cover from "./components/Cover";
import Notification from "./components/Notification";

import { useState, useCallback } from "react";
import { indexerClient, myAlgoConnect } from "./utils/constants";
import {
  getPostsAction,
  tipPostAction,
  createPostAction,
} from "./utils/blogger_frontend";
import { toast } from "react-toastify";

function App() {
  const [balance, setBalance] = useState(0);
  const [address, setAddress] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createLoader, setCreateLoader] = useState(false);
  const [tipLoader, setTipLoader] = useState(false);

  const fetchBalance = async (accountAddress) => {
    indexerClient
      .lookupAccountByID(accountAddress)
      .do()
      .then((response) => {
        const _balance = response.account.amount;
        setBalance(_balance);
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const connectWallet = async () => {
    myAlgoConnect
      .connect()
      .then((accounts) => {
        const _account = accounts[0];
        setAddress(_account.address);
        fetchBalance(_account.address);
        if (_account.address) getPosts();
      })
      .catch((error) => {
        console.log("Could not connect to MyAlgo wallet");
        console.error(error);
      });
  };

  const createPost = async (data) => {
    setCreateLoader(true);
    try {
      toast.info("Creating post");
      await createPostAction(address, data);
      toast.dismiss();
      toast.success("Post created successful");
      getPosts();
    } catch (error) {
      console.log(error);
      toast.error("Failed to create post");
    } finally {
      setCreateLoader(false);
    }
  };

  const tip = async (data) => {
    const { tip, post } = data;
    setTipLoader(true);
    try {
      toast.info("Sending your tips");
      await tipPostAction(address, post, tip);
      toast.dismiss();
      toast.success("Tips sent successful");
      getPosts();
    } catch (error) {
      console.log(error);
      toast.error("Failed to send tips");
    } finally {
      setTipLoader(false);
    }
  };

  const getPosts = useCallback(async () => {
    setLoading(true);
    try {
      toast.info("Getting posts");
      const posts = await getPostsAction();
      if (posts) setPosts(posts);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <>
      {address ? (
        <div>
          <Notification />
          <Head balance={balance} />
          <Hero />
          <Main
            blogLoader={loading}
            createLoader={createLoader}
            tipLoader={tipLoader}
            posts={posts}
            createPost={createPost}
            tipFunction={tip}
          />
        </div>
      ) : (
        <Cover name={"Algo Blogger"} connect={connectWallet} />
      )}
    </>
  );
}

export default App;
