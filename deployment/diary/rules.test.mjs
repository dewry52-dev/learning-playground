import fs from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,deleteDoc,collection,query,limit,serverTimestamp,Timestamp} from 'firebase/firestore';
test('private diary ownership, exact schema, timestamps and valid CRUD',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-classroom-diary',firestore:{host:'127.0.0.1',port:8180,rules:fs.readFileSync('firestore.rules','utf8')}});
 try{
  const alice=env.authenticatedContext('alice',{firebase:{sign_in_provider:'google.com'}}).firestore('diary');
  const bob=env.authenticatedContext('bob',{firebase:{sign_in_provider:'google.com'}}).firestore('diary');
  const anonymous=env.unauthenticatedContext().firestore('diary');
  const otherProvider=env.authenticatedContext('alice',{firebase:{sign_in_provider:'password'}}).firestore('diary');
  const path=['users','alice','entries','test'];
  const valid={date:'2026-10-17',mood:'happy',title:'테스트',body:'비공개 일기 테스트',createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
  await assertFails(setDoc(doc(anonymous,...path),valid));
  await assertFails(setDoc(doc(bob,...path),valid));
  await assertFails(setDoc(doc(otherProvider,...path),valid));
  await assertFails(setDoc(doc(alice,...path),{...valid,extra:'unexpected'}));
  await assertFails(setDoc(doc(alice,...path),{...valid,title:'x'.repeat(101)}));
  await assertSucceeds(setDoc(doc(alice,...path),valid));
  await assertFails(getDoc(doc(bob,...path)));
  await assertFails(getDoc(doc(anonymous,...path)));
  await assertFails(getDocs(query(collection(bob,'users','alice','entries'),limit(500))));
  const snapshot=await assertSucceeds(getDoc(doc(alice,...path)));
  const stored=snapshot.data();assert.equal(stored.title,'테스트');
  await assertFails(setDoc(doc(alice,...path),{...stored,body:'x'.repeat(30001),updatedAt:serverTimestamp()}));
  await assertFails(setDoc(doc(alice,...path),{...stored,body:123,updatedAt:serverTimestamp()}));
  await assertFails(setDoc(doc(alice,...path),{...stored,ownerId:'bob',updatedAt:serverTimestamp()}));
  await assertFails(setDoc(doc(alice,...path),{...stored,createdAt:Timestamp.fromMillis(0),updatedAt:serverTimestamp()}));
  const {body,...missing}=stored;
  await assertFails(setDoc(doc(alice,...path),{...missing,updatedAt:serverTimestamp()}));
  await assertSucceeds(setDoc(doc(alice,...path),{...stored,title:'수정',updatedAt:serverTimestamp()}));
  await assertSucceeds(getDocs(query(collection(alice,'users','alice','entries'),limit(500))));
  await assertFails(deleteDoc(doc(bob,...path)));
  await assertSucceeds(deleteDoc(doc(alice,...path)));
 } finally {await env.cleanup()}
});
