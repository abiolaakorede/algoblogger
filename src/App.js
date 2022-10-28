import './App.css';
import Head from "./components/Head"
import Hero from "./components/Hero"
import Main from './components/Main';
import Cover from "./components/Cover";

import { useState, useEffect } from "react";
import { indexerClient, myAlgoConnect } from "./utils/constants";
import { getPostsAction, tipPostAction, createPostAction } from "./utils/blogger_frontend"


function App() {
  const [balance, setBalance] = useState(0);
  const [address, setAddress] = useState(null);
  const [posts, setPosts] = useState([]);

  const fetchBalance = async (accountAddress) => {
    indexerClient.lookupAccountByID(accountAddress).do()
      .then(response => {
        const _balance = response.account.amount;
        setBalance(_balance);
      })
      .catch(error => {
        console.log(error);
      });
  };

  const connectWallet = async () => {
    myAlgoConnect.connect()
      .then(accounts => {
        const _account = accounts[0];
        console.log(_account)
        setAddress(_account.address);
        fetchBalance(_account.address);
        if (_account.address) getPosts()
      }).catch(error => {
        console.log('Could not connect to MyAlgo wallet');
        console.error(error);
      })
  };

  const createPost = async (data) => {
    try {
      await createPostAction(address, data);
      getPosts()
    } catch (error) {
      console.log(error);
    }
  }

  const tip = async (data) => {
    console.log(data);
    const {tip, post} = data
    try {
      await tipPostAction(address, post, tip);
    } catch (error) {
      console.log(error);
    }finally{
      getPosts()
    }
  }

  const getPosts = async () => {
    try {
      const posts = await getPostsAction();
      if (posts) setPosts(posts)
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <>
      {address ? <div>
        <Head balance={balance} />
        <Hero />
        <Main posts={posts} createPost={createPost} tipFunction={tip} />
      </div> : <Cover name={"Algo Blogger"} connect={connectWallet} />}
    </>
  );
}

export default App;
