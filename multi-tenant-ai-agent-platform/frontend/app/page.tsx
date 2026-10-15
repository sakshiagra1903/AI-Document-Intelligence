'use client';import {useEffect} from 'react';export default function Home(){useEffect(()=>{location.href=localStorage.getItem('access_token')?'/dashboard':'/login'},[]);return null}
