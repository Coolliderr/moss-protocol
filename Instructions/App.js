import React from 'react';
import './App.css';
import type {Node} from 'react';
import { ethers } from 'ethers';
import { Icon } from '@iconify/react';

import Coin_Moss from './Coin_Moss.json';
import Nft_MOSS from './Nft_MOSS.json';
import Countdown from './Countdown';
import BEP20USDT from './BEP20USDT.json';
import MOSStaking from './MOSStaking.json';
function getValueFromExistingSmartContract(instance, account, address, jsonFile, functionName, inputTypeList, outputTypeList, chainInfo, setChainInfo, updateChecks, ...argsIn){
	
	var defaultSlate = {};

	function coverValueIfNecc(type, value){
		if (type.t === 'ListType'){
			return value.map((aVal, index)=>{
				return coverValueIfNecc(type.c, aVal);
			})
		}else if (type.t === 'Object'){
			var p = {};
			type.c.forEach((aC, index)=>{
				var cc = coverValueIfNecc(aC, value[aC.n]);
				p[aC.n] = cc;
			})
			return p;
		}else if (type.t === 'UInteger' || type.t === 'Integer'){
			if (!value.hex){
	  			return ethers.BigNumber.from(value);
			}
		}else if (type.t === 'Text String'){
			return value.split('.infura').join('');
		}
		return value;
	}

	function flattenType(inputType, aI){
		if (inputType.t === 'ListType'){
			return aI.map((anInput, index)=>{
				return flattenType(inputType.c, anInput);
			}).join(', ');
		}else if (inputType.t === 'UInteger' || inputType.t === 'Integer'){
			return aI.toString();
		}else if (inputType.t === 'Boolean'){
			if (aI){
				return 'true'
			}else{
				return 'false'
			}
		}else if (inputType.t === 'Object'){
			var cc = {};
			inputType.c.forEach((anInput, index)=>{
				var p = flattenType(anInput, aI[anInput.n]);
				cc[anInput.n] = p;
			})
			return JSON.stringify(cc);
		}else if (inputType.t === 'Bytes'){
			return '_';
		}else if (inputType.t === 'Text String' || inputType.t === 'Address'){
			return aI;
		}else{
			console.warn(inputType);
			return aI;
		}
	}

	if (instance && account){

		var args = argsIn.filter((aI, index)=>{
			return index < inputTypeList.length;
		})

		var flattenedInputs = args.map((aI, index)=>{
			var inputType = inputTypeList[+index];
			return flattenType(inputType, aI);
		})

		var point = [address, functionName].concat(flattenedInputs);
		var pOut = layoutFoundationForAnObject(point, chainInfo);
		if (pOut[0] !== undefined){
			return pOut;
		}else{

			function onSuccess(value){
				var k = {checked:true}
				if (outputTypeList.length === 1){
					k[0] = coverValueIfNecc(outputTypeList[0] , value);
				}else{
					for (var i = 0; i < outputTypeList.length; i++){
						var aVal = coverValueIfNecc(outputTypeList[i], value[i]);
						k[i] = aVal;
					}
				}
				replacement(point, chainInfo, k);
				setChainInfo({...chainInfo});
			}
			function onFail(e){
				console.log(e);
			}

			function actuallyCheck(){
				var gotNotChecked = false;
				for (var i = 0; i < updateChecks.length; i++){
					if (!updateChecks[i].checked){
						gotNotChecked = true;
						break;
					}
				}
				if (gotNotChecked){
					setTimeout(function(e){ actuallyCheck(); }, 500);
				}else{
					cryptoAdmin(instance, {add:address, json:jsonFile}, functionName, onSuccess, onFail, argsIn[argsIn.length - 1], ...args);

				}
			}

			actuallyCheck();
			return defaultSlate;
		}
	}else{
		return defaultSlate;
	}
}

function defaultValue(type, path){
	for (var i = 0; i < path.length; i++){
		if (path[i].t === 'l'){
			type = type.c;
		}else if (path[i].t === 'oP'){
			for (var j = 0; j < type.c.length; j++){
				if (type.c[j].n === path[i].v){
					type = type.c[j].t;
					break;
				}
			}
		}
	}

	function processDefault(type){
		if (type.t === 'ListType'){
			return [];
		}else if (type.t === 'Object'){
			var out = {};
			for (var i = 0; i < type.c.length; i++){
				out[type.c[i].n] = processDefault(type.c[i].t);
			}
		}else if (type.t === 'UInteger' || type.t === 'Integer'){
			return ethers.BigNumber.from('0');
		}else if (type.t === 'Text String'){
			return '-';
		}else if (type.t === 'Address'){
			return '0x0000000000000000000000000000000000000000'
		}else if (type.t === 'Boolean'){
			return false;
		}
	}
	return processDefault(type);
}


function urlSearchParams(searchFor){
		const queryString = window.location.search;
		const urlParams = new URLSearchParams(queryString);
		return urlParams.get(searchFor);
}

const TextInputRecall = ({defaultValue, style, className, onChange, onKeyDown, idNos, inputValues, setInputValues, gVs}): Node => {

		var onChangeExt = onChange;
		var onKeyDownExt = onKeyDown;
		var idOut = [idNos].concat(gVs).join('_');
		
		var value = (inputValues[idOut]? inputValues[idOut] : '');
		
		function setValue(valueIn){
				inputValues[idOut] = valueIn;
				setInputValues({...inputValues});
		}

		React.useEffect(() => {
				setValue(defaultValue);
		}, [defaultValue]);

		function onChangeL(e){
				setValue(e.target.value);
				if (onChangeExt){
						onChangeExt(e.target.value);
				}
		}

		function onKeyDownL(e){
				if (onKeyDownExt){
						onKeyDownExt(e);
				}
		}
		return <input className={className} value={value} disabled={style.disabled} onKeyDown={onKeyDownL} onChange={onChangeL} placeholder={style.placeholder} style={style} />;  
}

function cryptoAdmin(instance, item, name, onSuccess, onFail, events, ...args) {
	const provider = new ethers.providers.Web3Provider(instance)
	const signer = provider.getSigner()
	const contract = new ethers.Contract(item.add, item.json.abi, signer)
	try {
		contract[name](...args).then(value=>{
			onSuccess(value);
		}).catch(err=>{
			onFail(err.message);
		});
	} catch (err) {
		onFail(err.message)
	}

	events.forEach((anEvent, index)=>{
		if (anEvent.f){
			const event1 = contract.filters[anEvent.k.name](...anEvent.k.conditions);
			contract.once(event1, ()=>{
				anEvent.f();
			})
		}else{
			const event = contract.filters[anEvent.name](...anEvent.conditions);
			contract.on(event, ()=>{
				cryptoAdmin(instance, item, name, onSuccess, onFail, [], ...args);
			})
		}
	})
}

function checkEquality(left, right, type){
		if (type.t === 'List'){
				if (left.length === right.length){
						for (var i = 0; i < left.length; i++){
								var p = checkEquality(left[0], right[0], type.c[0]);
								if (!p){
										return false;
								}
						}
						return true;
				}else{
						return false;
				}
		}else if (type.t === 'Object'){
				for (var i = 0; i < type.c.length; i++){
						var title = type.c[i].title;
						var p1 = checkEquality(left[title], right[title], type.c[i]);
						if (!p1){
								return false;
						}
				}
				return true;
		}else if (type.t === 'Date' || type.t === 'Date Time'){
				return left.getTime() === right.getTime();
		}else if (type.t === 'Integer' || type.t === 'UInteger'){
				return left.eq(right);
		}else{
				return left === right;
		}
}

const DecimalInputRecall = ({defaultValue, style, className, onChange, idNos, inputValues, setInputValues, gVs}): Node => {

		var onChangeExt = onChange;
		var idOut = [idNos].concat(gVs).join('_');
		
		var value = (inputValues[idOut]? inputValues[idOut] : '');
		
		function setValue(valueIn){
				inputValues[idOut] = valueIn;
				setInputValues({...inputValues});
		}

		React.useEffect(() => {
				setValue(defaultValue + '');
		}, [defaultValue + '']);

		function onChange1(e){
				var valueOut = e.target.value;
				setValue(valueOut);
				if (onChangeExt){
						if (!isDecimalText(valueOut) && valueOut !== '' && valueOut !== '+' && valueOut !== '.'){
								return;
						}
						if (valueOut === '' || valueOut === '+' ||valueOut === '.'){
								valueOut = '0';
						}
						onChangeExt(+valueOut);
				}
		}

		return <input className={className} value={value} onChange={onChange1} disabled={style.disabled} placeholder={style.placeholder} style={style} />;  
}

function textToDecimal(input){
		var p = isDecimalText(input);
		if (!p){
				return 0;
		}else{
				return +input;
		}
}

function makeADecimalTextIntoLongText(decimalText, digits){
		var locOfDot = decimalText.indexOf('.');
		if (locOfDot === -1){
				return decimalText + makeDigits(digits);
		}else{
				var before = decimalText.substr(0, locOfDot);
				var after = decimalText.substr(locOfDot + 1);
				if (after.length > digits){
						return before + after.substr(0, digits);      
				}else{
						return before + after + makeDigits(digits - after.length);
				}
		}
}

function makeDigits(digits){
		var x = '';
		for (var i = 0; i < digits; i++){
				x += '0';
		}
		return x;
}

const UIntegerInputRecall = ({defaultValue, style, className, onChange, idNos, inputValues, setInputValues, gVs}): Node => {

		var onChangeExt = onChange;
		var idOut = [idNos].concat(gVs).join('_');
		
		var value = (inputValues[idOut]? inputValues[idOut] : '');
		
		function setValue(valueIn){
				inputValues[idOut] = valueIn;
				setInputValues({...inputValues});
		}

		React.useEffect(() => {
				setValue(defaultValue.toString());
		}, [defaultValue.toString()]);

		function onChange1(e){
				var valueOut = e.target.value;
				setValue(valueOut);
				if (onChangeExt){
						if (!isPositiveIntegerOrZeroText(valueOut) && valueOut !== ''){
								return;
						}
						if (valueOut === ''){
								valueOut = '0';
						}
						onChangeExt(ethers.BigNumber.from(valueOut));
				}
		}

		return <input className={className} value={value} disabled={style.disabled} onChange={onChange1} placeholder={style.placeholder} style={style} />;  
}

function textToUInt(input){
		var p = isPositiveIntegerOrZeroText(input);
		if (!p){
				return ethers.BigNumber.from('0');
		}else{
				return ethers.BigNumber.from(input).abs();
		}
}

function shortenName(text){
				if (text.length < 9){
								return text;
				}    
				return text.substr(0, 2) + '...' + text.substr(text.length - 4);
}

function layoutFoundationForAnObject(list, chainInfo){
	var p = chainInfo;
	for (var i = 0; i < list.length; i++){
		var p1 = p[list[i]];
		if (!p1){
			p[list[i]] = {};
			p1 = p[list[i]];
		}
		p = p1;
	}
	return p;
}

function replacement(list, chainInfo, object){
	var p = chainInfo;
	for (var i = 0; i < list.length; i++){
		if (i === list.length - 1){
			p[list[i]] = object;
		}else{
			p = p[list[i]];
		}
	}
}

function isDecimalText(thisVal){
				if (thisVal && (typeof thisVal === 'string' || thisVal instanceof String)){
						var regex3 = /^[+-]?([0-9]+\.?[0-9]*|\.[0-9]+)$/
						return thisVal.match(regex3);    
				}
				return false;
		}

function isPositiveIntegerOrZeroText(p){
				if (p === '0'){
						return true;
				}
				if (p){
						var regex3 = /^([1-9]\d*)$/
						return p.match(regex3);
				}else{
						return false;
				}
		}


const App = (): Node => {

	const [whichScreen, setWhichScreen] = React.useState('c0_e77e83e1')
	const [inputValues, setInputValues] = React.useState({})
	const [instance, setInstance] = React.useState(false);
	const [chainInfo, setChainInfo] = React.useState({});
	const [account, setAccount] = React.useState(false);
	const [chainId, setChainId] = React.useState(ethers.BigNumber.from('0'));
	function clickActionfe_c0_e77e83e1__s_c0_d60c01aa_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c0_e08bf6dc_i_c46_9686feb8(e){
		if(!(account === false)
		) {
			cryptoAdmin(instance, {add:'0xD0e477451BCc5fD132f877F965958c4bC581fbd1', json:Coin_Moss}, 'addReferralAddress', function(){}
			, function(e1){
				window.alert('绑定失败');
			}, [], inputValues['fe c0_e77e83e1 _s c0_d60c01aa k c0_4209f3d9 i c0_241bb32f i c0_95116a74 i c0_e08bf6dc i c57_b0778134']);
		}else{
			connectWallet(); 
		};
		e.stopPropagation();
	}
	function clickActionfe_c0_e77e83e1__s_c0_d60c01aa_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c0_e12e6a26_i_c44_38aee7c2(e){
		navigator.clipboard.writeText('0xD0e477451BCc5fD132f877F965958c4bC581fbd1');
		e.stopPropagation();
	}
	function clickActionfe_c0_e77e83e1__s_c0_d60c01aa_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c0_e12e6a26_i_c45_bb3396a5(e){
		navigator.clipboard.writeText('0xBf5F61642F5f64c7F94D17d64Ff050bDE3DB85a3');
		e.stopPropagation();
	}
	function clickActionfe_c95_7953d46c__s_c0_11592b01_k_c0_b3594fd4_i_c0_316188f0_i_c169_a1b3e86a(e){
		setWhichScreen('c0_e77e83e1'); window.scrollTo(0, 0);
		e.stopPropagation();
	}
	function clickActionfe_c95_7953d46c__s_c0_d60c01aa_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c0_f3415538_i_c138_a5888f97(e){
		function downPath(){
			if (function(outputTypeList, pathDownList){ return getValueFromExistingSmartContract(instance, account, '0xD0e477451BCc5fD132f877F965958c4bC581fbd1', Coin_Moss, 'allowance', [{t:'Address'}, {t:'Address'}], outputTypeList, chainInfo, setChainInfo, [], account, '0xBf5F61642F5f64c7F94D17d64Ff050bDE3DB85a3', []); }([{t:'UInteger'}], []).checked){
				if(function(outputTypeList, pathDownList){ var out = getValueFromExistingSmartContract(instance, account, '0xD0e477451BCc5fD132f877F965958c4bC581fbd1', Coin_Moss, 'allowance', [{t:'Address'}, {t:'Address'}], outputTypeList, chainInfo, setChainInfo, [], account, '0xBf5F61642F5f64c7F94D17d64Ff050bDE3DB85a3', []); if (out.checked){return out[0];}else{return defaultValue(outputTypeList[0], pathDownList)}}([{t:'UInteger'}], []).gte(ethers.BigNumber.from('99999999999999999999999'))
				) {
					cryptoAdmin(instance, {add:'0xBf5F61642F5f64c7F94D17d64Ff050bDE3DB85a3', json:Nft_MOSS}, 'mint', function(){}
					, function(e1){
						window.alert('做市失败，请重试');
					}, []);
				}else{
					cryptoAdmin(instance, {add:'0xD0e477451BCc5fD132f877F965958c4bC581fbd1', json:Coin_Moss}, 'approve', function(){}
					, function(e1){
					}, [], '0xBf5F61642F5f64c7F94D17d64Ff050bDE3DB85a3', ethers.BigNumber.from('999999999999999999999999'));
				};
			}else{
				setTimeout(function(e){downPath()}, 500);
			}
		}
		downPath()
		e.stopPropagation();
	}
	function clickActionfe_c95_7953d46c__s_c0_d60c01aa_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c0_7cc0b9a6_i_c36_05592e73(e){
		setWhichScreen('c42_8a189b10'); window.scrollTo(0, 0);
		e.stopPropagation();
	}
	function clickActionfe_c95_065132f3__s_c0_11592b01_k_c0_b3594fd4_i_c0_316188f0_i_c168_463fb4b1(e){
		setWhichScreen('c0_e77e83e1'); window.scrollTo(0, 0);
		e.stopPropagation();
	}
	function clickActionfe_c95_065132f3__s_c0_d60c01aa_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c0_f3415538_i_c59_4f420c78(e){
		if(!(account === false)
		) {
			function downPath_0(){
				if (function(outputTypeList, pathDownList){ return getValueFromExistingSmartContract(instance, account, '0x55d398326f99059fF775485246999027B3197955', BEP20USDT, 'allowance', [{t:'Address'}, {t:'Address'}], outputTypeList, chainInfo, setChainInfo, [], account, '0xD0e477451BCc5fD132f877F965958c4bC581fbd1', []); }([{t:'UInteger'}], []).checked){
					if(function(outputTypeList, pathDownList){ var out = getValueFromExistingSmartContract(instance, account, '0x55d398326f99059fF775485246999027B3197955', BEP20USDT, 'allowance', [{t:'Address'}, {t:'Address'}], outputTypeList, chainInfo, setChainInfo, [], account, '0xD0e477451BCc5fD132f877F965958c4bC581fbd1', []); if (out.checked){return out[0];}else{return defaultValue(outputTypeList[0], pathDownList)}}([{t:'UInteger'}], []).gte(ethers.BigNumber.from('9999999999999999999999999'))
					) {
						cryptoAdmin(instance, {add:'0xD0e477451BCc5fD132f877F965958c4bC581fbd1', json:Coin_Moss}, 'mint', function(){}
						, function(e2){
							window.alert('铸币失败，请重试');
						}, [], ethers.BigNumber.from( makeADecimalTextIntoLongText(textToDecimal(inputValues['fe c95_065132f3 _s c0_d60c01aa k c0_4209f3d9 i c0_241bb32f i c0_95116a74 i c0_e08bf6dc i c57_b0778134']).toString(), ethers.BigNumber.from('18').toNumber()) ));
					}else{
						cryptoAdmin(instance, {add:'0x55d398326f99059fF775485246999027B3197955', json:BEP20USDT}, 'approve', function(){}
						, function(e2){
						}, [], '0xD0e477451BCc5fD132f877F965958c4bC581fbd1', ethers.BigNumber.from('99999999999999999999999999999999999999999999999999999'));
					};
				}else{
					setTimeout(function(e){downPath_0()}, 500);
				}
			}
			downPath_0()
		}else{
			connectWallet(); 
		};
	}
	function clickActionfe_c97_54039c72__s_c0_11592b01_k_c0_b3594fd4_i_c0_316188f0_i_c169_563b05a2(e){
		setWhichScreen('c0_e77e83e1'); window.scrollTo(0, 0);
		e.stopPropagation();
	}
	function clickActionfe_c97_54039c72__s_c0_d60c01aa_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c0_f3415538_i_c59_4f420c78(e){
		navigator.clipboard.writeText(('https://mosscoin.info/?moss=' + account));
		e.stopPropagation();
	}
	function clickActionfe_c97_54039c72__s_c0_d60c01aa_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c0_e12e6a26_i_c73_beb69b24(e){
		cryptoAdmin(instance, {add:'0xD0e477451BCc5fD132f877F965958c4bC581fbd1', json:Coin_Moss}, 'withdrawReferral', function(){}
		, function(e0){
		}, [], ethers.BigNumber.from( makeADecimalTextIntoLongText(textToDecimal(inputValues['fe c97_54039c72 _s c0_d60c01aa k c0_4209f3d9 i c0_241bb32f i c0_95116a74 i c0_e12e6a26 i c73_d74a734e']).toString(), ethers.BigNumber.from('18').toNumber()) ));
		e.stopPropagation();
	}
	function clickActionfe_c97_54039c72__s_c0_d60c01aa_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c0_e12e6a26_i_c86_e2b555b5(e){
		window.open('https://t.me/mossprotocol');
		e.stopPropagation();
	}
	function clickActionfe_c42_8a189b10__s_c44_e6e05431_k_c0_b3594fd4_i_c0_316188f0_i_c169_563b05a2(e){
		setWhichScreen('c0_e77e83e1'); window.scrollTo(0, 0);
		e.stopPropagation();
	}
	function clickActionfe_c42_8a189b10__s_c44_57491d07_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c53_696e57d1_i_c53_6c35e493(e){
		function downPath(){
			if (function(outputTypeList, pathDownList){ return getValueFromExistingSmartContract(instance, account, '0xBf5F61642F5f64c7F94D17d64Ff050bDE3DB85a3', Nft_MOSS, 'isApprovedForAll', [{t:'Address'}, {t:'Address'}], outputTypeList, chainInfo, setChainInfo, [], account, '0xf1727Ae30F14FEfB4F48890C1a56cBC26Ca64677', []); }([{t:'Boolean'}], []).checked){
				if(function(outputTypeList, pathDownList){ var out = getValueFromExistingSmartContract(instance, account, '0xBf5F61642F5f64c7F94D17d64Ff050bDE3DB85a3', Nft_MOSS, 'isApprovedForAll', [{t:'Address'}, {t:'Address'}], outputTypeList, chainInfo, setChainInfo, [], account, '0xf1727Ae30F14FEfB4F48890C1a56cBC26Ca64677', []); if (out.checked){return out[0];}else{return defaultValue(outputTypeList[0], pathDownList)}}([{t:'Boolean'}], [])
				) {
					cryptoAdmin(instance, {add:'0xf1727Ae30F14FEfB4F48890C1a56cBC26Ca64677', json:MOSStaking}, 'stake', function(){}
					, function(e1){
						window.alert('质押失败');
					}, [], textToUInt(inputValues['fe c42_8a189b10 _s c44_57491d07 k c0_4209f3d9 i c0_241bb32f i c0_95116a74 i c53_696e57d1 i c57_cbbff574']));
				}else{
					cryptoAdmin(instance, {add:'0xBf5F61642F5f64c7F94D17d64Ff050bDE3DB85a3', json:Nft_MOSS}, 'setApprovalForAll', function(){}
					, function(e1){
						window.alert('授权失败');
					}, [], '0xf1727Ae30F14FEfB4F48890C1a56cBC26Ca64677', true);
				};
			}else{
				setTimeout(function(e){downPath()}, 500);
			}
		}
		downPath()
		e.stopPropagation();
	}
	function clickActionfe_c42_8a189b10__s_c44_57491d07_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c53_696e57d1_i_c56_96375b52(e){
		cryptoAdmin(instance, {add:'0xf1727Ae30F14FEfB4F48890C1a56cBC26Ca64677', json:MOSStaking}, 'unstake', function(){}
		, function(e0){
			window.alert('提取NFT失败');
		}, [], textToUInt(inputValues['fe c42_8a189b10 _s c44_57491d07 k c0_4209f3d9 i c0_241bb32f i c0_95116a74 i c53_696e57d1 i c57_cbbff574']));
		e.stopPropagation();
	}
	function clickActionfe_c42_8a189b10__s_c44_57491d07_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c53_282e3be4_i_c63_a7547a7b(e){
		cryptoAdmin(instance, {add:'0xf1727Ae30F14FEfB4F48890C1a56cBC26Ca64677', json:MOSStaking}, 'withdrawInterestWithoutUnstaking', function(){}
		, function(e0){
		}, [], ethers.BigNumber.from( makeADecimalTextIntoLongText(textToDecimal(inputValues['fe c42_8a189b10 _s c44_57491d07 k c0_4209f3d9 i c0_241bb32f i c0_95116a74 i c53_282e3be4 i c63_b2dcdb8f']).toString(), ethers.BigNumber.from('18').toNumber()) ), textToUInt(inputValues['fe c42_8a189b10 _s c44_57491d07 k c0_4209f3d9 i c0_241bb32f i c0_95116a74 i c53_696e57d1 i c57_cbbff574']));
		e.stopPropagation();
	}
	function clickActionfe_c42_8a189b10__s_c44_57491d07_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c53_282e3be4_i_c36_05592e73(e){
		setWhichScreen('c95_7953d46c'); window.scrollTo(0, 0);
		e.stopPropagation();
	}
	function clickActionfo_Footer_k_c52_43fa9f5d_i_c56_3e3d43ca_i_c27_6db47d65(e){
		setWhichScreen('c95_7953d46c'); window.scrollTo(0, 0);
		e.stopPropagation();
	}
	function clickActionfo_Footer_k_c52_43fa9f5d_i_c56_3e3d43ca_i_c22_5c0584af(e){
		setWhichScreen('c95_065132f3'); window.scrollTo(0, 0);
		e.stopPropagation();
	}
	function clickActionfo_Footer_k_c52_43fa9f5d_i_c56_3e3d43ca_i_c74_11c3b8de(e){
		setWhichScreen('c97_54039c72'); window.scrollTo(0, 0);
		e.stopPropagation();
	}
	function clickActionfo_Footer_k_c26_a0e1a0f6_i_c56_3e3d43ca_i_c22_5c0584af(e){
		setWhichScreen('c95_7953d46c'); window.scrollTo(0, 0);
		e.stopPropagation();
	}
	function clickActionfo_Footer_k_c26_a0e1a0f6_i_c56_3e3d43ca_i_c74_11c3b8de(e){
		setWhichScreen('c95_065132f3'); window.scrollTo(0, 0);
		e.stopPropagation();
	}
	function clickActionfo_Footer_k_c26_a0e1a0f6_i_c56_3e3d43ca_i_c69_11d538db(e){
		setWhichScreen('c97_54039c72'); window.scrollTo(0, 0);
		e.stopPropagation();
	}
	function clickActioncn_c8_af50f325_nv_i_c8_bf89779e(e){
		connectWallet(); 
		e.stopPropagation();
	}
	function getInfo(instanceIn){
		setInstance(instanceIn); setChainInfo({}); 
	}async function connectWallet(){
		if (account){
			return;
		}

		const Web3Modal = window.Web3Modal.default;
		const WalletConnectProvider = window.WalletConnectProvider.default;
		const Fortmatic = window.Fortmatic;

		const providerOptions = {
			walletconnect: { 
				package: WalletConnectProvider,
				options: { infuraId: '8043bb2cf99347b1bfadfb233c5325c0'}
			},
			fortmatic: {
				package: Fortmatic,
				options: {key: 'pk_test_391E26A3B43A3350'}
			}
		};

		const web3Modal = new Web3Modal({
			cacheProvider: false, // optional
			providerOptions, // required
		});
		web3Modal.clearCachedProvider();

		const d = new Date();
		let time = d.getTime();

		try {
			const instance = await web3Modal.connect(); getInfo(instance);

			// Subscribe to accounts change
			instance.on('accountsChanged', (accounts) => {
				if (accounts.length > 0){
					setAccount(accounts[0]); document.account = accounts[0]; getInfo(instance);
				}else{
					setAccount(false); document.account = false; setInstance(false); 
				}
			});

			instance.on('chainChanged', (chainId) => {
				setChainId(chainId); getInfo(instance);
			});
			const provider = new ethers.providers.Web3Provider(instance)
			const signer = provider.getSigner()
			signer.getAddress().then(function(account){
				setAccount(account);
				document.account = account;
				provider.getNetwork().then(function(network){
					setChainId(ethers.BigNumber.from(network.chainId));
			        if (network.chainId !== 56){
			          if (window.ethereum){window.ethereum.request({method: 'wallet_addEthereumChain',params: [{chainId: `0x${Number(56).toString(16)}`,
                chainName: 'Binance Smart Chain Mainnet',
                nativeCurrency: {
                  name: 'BNB', symbol: 'BNB', decimals: 18
                },
                rpcUrls: ['https://bsc-dataseed1.binance.org', 'https://bsc-dataseed2.binance.org'], blockExplorerUrls: ['https://bscscan.com']
              }]});
			          }          
			        }
				})
			}).catch((err)=>{
				console.log(err);
			});

		} catch(e) {
			const d1 = new Date();
			let time1 = d1.getTime();
			if (time1 - time < 100){
				if (e.message === 'User Rejected'){
					window.alert('It seems you had been previously asked to connect to a site via metamask but the query was not completed. Please open up Metamask (by clicking on the top right icon) and click Connect in the pop-up. If that fails, please refresh this page.')
				}
			}
			return;
		}
	}
	function nav_c8_af50f325(){
		return (
		<nav className='navbar navbar-light' style={{backgroundColor:'rgb(251, 169, 44)'}}>
			<span className='navbar-brand' style={{fontWeight:'bold'}}><img src={'https://www.cues.sg/client_pictures/342_BqCla7Kg.png'} style={{margin:10,width:'29.58px'}} alt='logo' />{'MOSS Protocol'}</span>
			
<button style={{cursor:'pointer'}} className='btn btn-normalLightBlue'  onClick={clickActioncn_c8_af50f325_nv_i_c8_bf89779e} >{(!(account === false) ? (chainId.eq(ethers.BigNumber.from(56)) ? shortenName(account) : ('Connect to the ' + 'Binance Smart Chain Mainnet' + ' chain')) : '连接钱包')}</button>
		</nav>)
	}
	var footer = <div style={{position:'relative', width:'100vw', overflow:'hidden', zIndex:0, backgroundColor:'rgb(255, 255, 255)'}}>
					<div><div style={{backgroundColor:'rgb(162, 178, 159)'}}>
						<div><div style={{backgroundColor:'rgb(0, 9, 44)'}} className='row justify-content-center align-items-start'>
							<button style={{cursor:'pointer'}} className='btn btn-link col-1 mt-3 ml-0 mr-4'  onClick={clickActionfo_Footer_k_c52_43fa9f5d_i_c56_3e3d43ca_i_c27_6db47d65} ><Icon height={'37px'} icon={'carbon:settings-adjust'} style={{color:'rgb(248, 237, 227)'}} /> {''}</button>
							<button style={{cursor:'pointer'}} className='btn btn-link col-1 ml-5 mr-5'  onClick={clickActionfo_Footer_k_c52_43fa9f5d_i_c56_3e3d43ca_i_c22_5c0584af} ><Icon height={'64px'} icon={'icomoon-free:coin-dollar'} style={{color:'rgb(248, 237, 227)'}} /> {''}</button>
							<button style={{cursor:'pointer'}} className='btn btn-link col-1 mt-3 ml-5 mr-5'  onClick={clickActionfo_Footer_k_c52_43fa9f5d_i_c56_3e3d43ca_i_c74_11c3b8de} ><Icon height={'37px'} icon={'ant-design:team-outlined'} style={{color:'rgb(248, 237, 227)'}} /> {''}</button>
						</div></div>
					</div></div>
					<div><div style={{backgroundColor:'rgb(162, 178, 159)'}}>
						<div><div style={{backgroundColor:'rgb(0, 9, 44)'}} className='row justify-content-center align-items-start'>
							<button style={{fontWeight:'bold', cursor:'pointer'}} className='btn btn-link col-3 ml-0 mr-4'  onClick={clickActionfo_Footer_k_c26_a0e1a0f6_i_c56_3e3d43ca_i_c22_5c0584af} >{'做市'}</button>
							<button style={{fontWeight:'bold', cursor:'pointer'}} className='btn btn-link col-2 ml-0 mr-0'  onClick={clickActionfo_Footer_k_c26_a0e1a0f6_i_c56_3e3d43ca_i_c74_11c3b8de} >{'铸币'}</button>
							<button style={{fontWeight:'bold', cursor:'pointer'}} className='btn btn-link col-3 ml-4 mr-4'  onClick={clickActionfo_Footer_k_c26_a0e1a0f6_i_c56_3e3d43ca_i_c69_11d538db} >{'个人中心'}</button>
						</div></div>
					</div></div>
				</div>
	if (whichScreen === 'c0_e77e83e1'){
		return <div style={{color:'rgb(255, 251, 251)', backgroundColor:'rgb(31, 31, 31)'}}>{nav_c8_af50f325()}
			<div style={{position:'relative', width:'100vw', overflow:'hidden', zIndex:0, backgroundColor:''}}>
				<div><div className=' container-fluid'>
					<div><div className='row justify-content-start align-items-start'>
						<div className=' col-12'/>
					</div></div>
					<div><div className='row justify-content-center align-items-start'>
						<div className=' col-11 col-md-8 text-center' style={{borderWidth:0, padding:10}}><span key={0} style={{color:'rgb(251, 169, 44)'}}><span style={{fontSize:'128px'}}><span style={{fontFamily:'Lobster'}}>MOSS</span></span></span><span key={1} style={{color:'rgb(251, 169, 44)'}}><span style={{fontSize:'70.94px'}}><span style={{fontFamily:'Lobster'}}>协议</span></span></span><br/>
						</div>
					</div></div>
					<div><div className='row justify-content-start align-items-start'>
						<div className=' col-4 col-md-8 text-right' style={{borderWidth:0, padding:10}}><span key={0} style={{color:'rgb(238, 238, 238)'}}><b><span style={{fontSize:'14.02px'}}><span style={{fontFamily:'Arvo'}}>开源人工智能交互协议。一种由AI生成的P2P流动性权益协议，可以仅为流动池中的单币提供流动性，然后由AI自动算法连接。并且铸币也由AI完成，整个过程没有人工操作。</span></span></b></span>
						</div>
						<div  className=' col-8 ml-0 mr-0'><img alt='generatedImage' src={'https://www.cues.sg/client_pictures/342_BqCla7Kg.png'} style={{borderWidth:0, width:'100%'}}/></div>
					</div></div>
				</div></div>
			</div>
			<div style={{position:'relative', width:'100vw', overflow:'hidden', zIndex:0, backgroundColor:''}}>
				<div><div className=' container-fluid'>
					<div><div className='row justify-content-start align-items-start'>
						<div className=' col-12'/>
					</div></div>
					<div><div className='row justify-content-center align-items-start'>
						<div className=' col-11 col-md-8'><div style={{backgroundColor:'rgb(251, 169, 44)', borderStyle:'none', borderWidth:1, borderColor:'rgb(0,0,0)', borderRadius:'0.80em'}} className=' container-fluid'>
							<div><div className='row justify-content-start align-items-start'>
								<div className=' col-12text-left' style={{borderWidth:0, padding:10}}>
									<div key={0}><span key={0} style={{color:'rgb(142, 50, 0)'}}><b><span style={{fontSize:'25.56px'}}>玩法介绍：</span></b></span>
									</div>
									<div key={1}><br/>
									</div>
									<div key={2}><span key={0} style={{color:'rgb(0, 0, 0)'}}><b><span style={{fontSize:'13.25px'}}>1、首先绑定推荐人的钱包地址。</span></b></span>
									</div>
								</div>
							</div></div>
							<div><div style={{display:(((function(outputTypeList, pathDownList){ var out = getValueFromExistingSmartContract(instance, account, '0xD0e477451BCc5fD132f877F965958c4bC581fbd1', Coin_Moss, 'referralRecordMap', [{t:'Address'}], outputTypeList, chainInfo, setChainInfo, [], account, []); if (out.checked){return out[1];}else{return defaultValue(outputTypeList[1], pathDownList)}}([{t:'Boolean'}, {t:'Address'}, {t:'UInteger'}], []) === '0x0000000000000000000000000000000000000000') ? false : true) ? 'none' : '')}} className='row justify-content-center align-items-start'>
								<TextInputRecall defaultValue={urlSearchParams('moss')} className='form-control col-9 ml-0 mr-0 text-center' style={{placeholder:'邀请人地址', backgroundColor:'rgb(0, 254, 241)', color:'rgb(255, 250, 250)', borderStyle:'solid', borderWidth:4, borderColor:'rgb(0,0,0)', borderRadius:'3.70em', disabled:false}} gVs={[]} setInputValues={setInputValues} inputValues={inputValues} idNos={'fe c0_e77e83e1 _s c0_d60c01aa k c0_4209f3d9 i c0_241bb32f i c0_95116a74 i c0_e08bf6dc i c57_b0778134'} />
								<div className=' col-8 text-center' style={{borderWidth:0, padding:10}}>   
								</div>
								<button style={{fontWeight:'bold', borderColor:'rgb(0,0,0)', borderWidth:3, borderStyle:'solid', borderRadius:'6.39em', cursor:'pointer'}} className='btn btn-success col-5'  onClick={clickActionfe_c0_e77e83e1__s_c0_d60c01aa_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c0_e08bf6dc_i_c46_9686feb8} >{'绑定'}</button>
							</div></div>
							<div><div className='row justify-content-start align-items-start'>
								<div className=' col-12 text-center' style={{borderWidth:0, padding:10, display:(((function(outputTypeList, pathDownList){ var out = getValueFromExistingSmartContract(instance, account, '0xD0e477451BCc5fD132f877F965958c4bC581fbd1', Coin_Moss, 'referralRecordMap', [{t:'Address'}], outputTypeList, chainInfo, setChainInfo, [], account, []); if (out.checked){return out[1];}else{return defaultValue(outputTypeList[1], pathDownList)}}([{t:'Boolean'}, {t:'Address'}, {t:'UInteger'}], []) === '0x0000000000000000000000000000000000000000') ? true : false) ? 'none' : '')}}>
									<span key={0} style={{fontSize:'2.10em', color:'rgb(28, 107, 26)', fontWeight:'bold'}}>{'祝贺！您已绑定钱包地址'}</span><br/>
								</div>
								<div className=' col-12text-left' style={{borderWidth:0, padding:10}}>
									<div key={0}><span key={0} style={{color:'rgb(0, 9, 44)'}}><b><span style={{fontSize:'13.25px'}}>2、点击下面导航栏中间的“</span></b></span><span key={1} style={{color:'rgb(202, 17, 243)'}}><b><span style={{fontSize:'13.25px'}}>铸币</span></b></span><span key={2} style={{color:'rgb(0, 9, 44)'}}><b><span style={{fontSize:'13.25px'}}>”，铸造MOSS代币。</span></b></span><br/>
									</div>
									<div key={1}><br/>
									</div>
									<div key={2}><span key={0} style={{color:'rgb(0, 9, 44)'}}><b><span style={{fontSize:'13.25px'}}>3、点击下面导航栏左边的“</span></b></span><span key={1} style={{color:'rgb(17, 64, 246)'}}><b><span style={{fontSize:'13.25px'}}>做市</span></b></span><span key={2} style={{color:'rgb(0, 9, 44)'}}><b><span style={{fontSize:'13.25px'}}>”，为MOSS代币的开盘提供流动性，可以获得MOSSNFT。持有NFT将享受AI发放的每天1%的USDT奖励。</span></b></span>
									</div>
									<div key={3}><br/>
									</div>
									<div key={4}><span key={0} style={{color:'rgb(0, 9, 44)'}}><b><span style={{fontSize:'13.25px'}}>3、点击下面导航栏右边的“</span></b></span><span key={1} style={{color:'rgb(46, 187, 169)'}}><b><span style={{fontSize:'13.25px'}}>个人中心</span></b></span><span key={2} style={{color:'rgb(0, 9, 44)'}}><b><span style={{fontSize:'13.25px'}}>”，查看您自己的邀请链接并发送给好友，绑定之后，您可享受好友每天铸币费用的10%提成。(注意！必须铸任意数量币之后才有推广资格)</span></b></span>
									</div>
									<div key={5}><br/>
									</div>
									<div key={6}><span key={0} style={{color:'rgb(0, 9, 44)'}}><b><span style={{fontSize:'13.25px'}}>4、MOSS 合约地址：</span></b></span>
									</div>
								</div>
								<button style={{fontSize:'0.70em', cursor:'pointer'}} className='btn btn-info col-11 col-md-7 ml-2'  onClick={clickActionfe_c0_e77e83e1__s_c0_d60c01aa_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c0_e12e6a26_i_c44_38aee7c2} >{'0xD0e477451BCc5fD132f877F965958c4bC581fbd1'}</button>
								<div className=' col-12 text-left' style={{borderWidth:0, padding:10}}><span key={0} style={{color:'rgb(0, 9, 44)'}}><b><span style={{fontSize:'0.85em'}}>5、NFT合约地址</span></b></span>
								</div>
								<button style={{fontSize:'0.70em', cursor:'pointer'}} className='btn btn-info col-11 col-md-7 ml-2'  onClick={clickActionfe_c0_e77e83e1__s_c0_d60c01aa_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c0_e12e6a26_i_c45_bb3396a5} >{'0xBf5F61642F5f64c7F94D17d64Ff050bDE3DB85a3'}</button>
							</div></div>
							<div><div style={{borderStyle:'solid', borderWidth:1, borderColor:'rgb(0,0,0)', borderRadius:'0em'}} className='row justify-content-start align-items-start'>
								<div className=' col-12 mt-2 mb-2'/>
								<div className=' col-12 text-center' style={{backgroundColor:'rgb(44, 251, 83)', lineHeight:'2.67em', borderColor:'rgb(239, 241, 246)', borderWidth:4, borderStyle:'solid', borderRadius:'4.86em', padding:10}}><span key={0} style={{color:'rgb(255, 46, 99)'}}><b><span style={{fontSize:'25px'}}><span style={{fontFamily:'Sue Ellen Francisco'}}>项目亮点</span></span></b></span><br/>
									<div key={2}><span key={0} style={{color:'rgb(0, 9, 44)'}}><i><span style={{fontSize:'13.25px'}}>1/所有代币均由投资者铸造，AI不预留任何代币</span></i></span>
									</div>
									<div key={3}><span key={0} style={{color:'rgb(0, 9, 44)'}}><i><span style={{fontSize:'13.25px'}}>2/由于没有任何预留，开盘添加的代币均由投资者铸造并通过做市而来，保障开盘价百分之百高于铸造价格一倍以上。</span></i></span>
									</div>
									<div key={4}><span key={0} style={{color:'rgb(0, 9, 44)'}}><i><span style={{fontSize:'13.25px'}}>3/铸造权限只有投资者所有，保证每个代币都是通过真金白银获得，由市场参与者发行代币，真正的公开公平公正去中心。</span></i></span>
									</div>
									<div key={5}><span key={0} style={{color:'rgb(0, 9, 44)'}}><i><span style={{fontSize:'13.25px'}}>4/业内首创的点对对流动性DEFI协议，可以进行单币添加流动性，改进传统方法，使资本利用效率最大化。</span></i></span>
									</div>
									<div key={6}><span key={0} style={{color:'rgb(0, 9, 44)'}}><i><span style={{fontSize:'13.25px'}}>5/铸造时间期限为</span></i></span><span key={1} style={{color:'rgb(178, 6, 0)'}}><b><i><span style={{fontSize:'13.25px'}}>5月1日0点</span></i></b></span><span key={2} style={{color:'rgb(0, 9, 44)'}}><i><span style={{fontSize:'13.25px'}}>之前，达到发行量上限100万枚停止铸造，有效的控制通货膨胀。</span></i></span>
									</div>
								</div>
							</div></div>
						</div></div>
					</div></div>
					<div><div className='row justify-content-start align-items-start'>
						<div className=' col-12'/>
					</div></div>
				</div></div>
			</div>{footer}</div>
	}else if (whichScreen === 'c95_7953d46c'){
		return <div style={{color:'rgb(255, 251, 251)', backgroundColor:'rgb(31, 31, 31)'}}>{nav_c8_af50f325()}
			<div style={{position:'relative', width:'100vw', overflow:'hidden', zIndex:0, backgroundColor:''}}>
				<div><div className=' container-fluid'>
					<div><div className='row justify-content-start align-items-start'>
						<div className=' col-12'/>
						<button style={{fontWeight:'bold', cursor:'pointer'}} className='btn btn-outline-primary col-4'  onClick={clickActionfe_c95_7953d46c__s_c0_11592b01_k_c0_b3594fd4_i_c0_316188f0_i_c169_a1b3e86a} ><Icon height={'20px'} icon={'bi:chevron-left'} /> {'回到首页'}</button>
					</div></div>
					<div><div className='row justify-content-center align-items-start'>
						<div className=' col-11 col-md-8 text-center' style={{borderWidth:0, padding:10}}><span key={0} style={{color:'rgb(251, 169, 44)'}}><span style={{fontSize:'75px'}}><span style={{fontFamily:'Sonsie One'}}>MOSS</span></span></span><span key={1} style={{color:'rgb(251, 169, 44)'}}><span style={{fontSize:'60px'}}><span style={{fontFamily:'Lobster'}}>做市</span></span></span><br/>
						</div>
					</div></div>
					<div><div className='row justify-content-start align-items-start'>
						<div className=' col-12 col-md-8 text-center' style={{borderWidth:0, padding:10}}><span key={0} style={{color:'#eeeeee'}}><b><span style={{fontSize:'17.1px'}}><span style={{fontFamily:'Arvo'}}>通过AI进行点对点做市。开盘前AI无任何预留，添加流动池的代币将会通过NFT卡片向市场募集MOSS，然后给予每天一定的USDT奖励。通过算法保障市场参与者都能获利。</span></span></b></span>
						</div>
						<div className=' col-12 col-md-8 text-center' style={{borderWidth:0, padding:10}}><br/>
						</div>
						<div className=' col-12 text-center' style={{lineHeight:'1.67em', borderWidth:0, padding:10}}><span key={0} style={{color:'rgb(57, 62, 70)'}}><b><span style={{fontSize:'18px'}}><span style={{fontFamily:'Cabin'}}>当前做市总锁仓量占比</span></span></b></span>
							<div key={1}><br/>
							</div>
							<div key={2}><span key={0} style={{color:'rgb(20, 255, 236)'}}><b><span style={{fontSize:'30px'}}><span style={{fontFamily:'Cabin'}}> </span></span></b></span>
								<span key={1} style={{fontSize:'2.50em', color:'rgb(20, 255, 236)', fontWeight:'bold'}}>{(ethers.BigNumber.from('0').gt(ethers.BigNumber.from('2')) ? (checkEquality(function(outputTypeList, pathDownList){ var out = getValueFromExistingSmartContract(instance, account, '0xD0e477451BCc5fD132f877F965958c4bC581fbd1', Coin_Moss, 'totalSupply', [], outputTypeList, chainInfo, setChainInfo, [], []); if (out.checked){return out[0];}else{return defaultValue(outputTypeList[0], pathDownList)}}([{t:'UInteger'}], []), ethers.BigNumber.from('0'), {t:'UInteger'}) ? (ethers.BigNumber.from('0')) : (function(outputTypeList, pathDownList){ var out = getValueFromExistingSmartContract(instance, account, '0xD0e477451BCc5fD132f877F965958c4bC581fbd1', Coin_Moss, 'balanceOf', [{t:'Address'}], outputTypeList, chainInfo, setChainInfo, [], '0xBf5F61642F5f64c7F94D17d64Ff050bDE3DB85a3', []); if (out.checked){return out[0];}else{return defaultValue(outputTypeList[0], pathDownList)}}([{t:'UInteger'}], []).mul(ethers.BigNumber.from('1000')).div(function(outputTypeList, pathDownList){ var out = getValueFromExistingSmartContract(instance, account, '0xD0e477451BCc5fD132f877F965958c4bC581fbd1', Coin_Moss, 'totalSupply', [], outputTypeList, chainInfo, setChainInfo, [], []); if (out.checked){return out[0];}else{return defaultValue(outputTypeList[0], pathDownList)}}([{t:'UInteger'}], [])))).div(ethers.BigNumber.from('10').pow(ethers.BigNumber.from('0').sub(ethers.BigNumber.from('2')))).toNumber()/(10 ** ethers.BigNumber.from('2').toNumber()) : (checkEquality(function(outputTypeList, pathDownList){ var out = getValueFromExistingSmartContract(instance, account, '0xD0e477451BCc5fD132f877F965958c4bC581fbd1', Coin_Moss, 'totalSupply', [], outputTypeList, chainInfo, setChainInfo, [], []); if (out.checked){return out[0];}else{return defaultValue(outputTypeList[0], pathDownList)}}([{t:'UInteger'}], []), ethers.BigNumber.from('0'), {t:'UInteger'}) ? (ethers.BigNumber.from('0')) : (function(outputTypeList, pathDownList){ var out = getValueFromExistingSmartContract(instance, account, '0xD0e477451BCc5fD132f877F965958c4bC581fbd1', Coin_Moss, 'balanceOf', [{t:'Address'}], outputTypeList, chainInfo, setChainInfo, [], '0xBf5F61642F5f64c7F94D17d64Ff050bDE3DB85a3', []); if (out.checked){return out[0];}else{return defaultValue(outputTypeList[0], pathDownList)}}([{t:'UInteger'}], []).mul(ethers.BigNumber.from('1000')).div(function(outputTypeList, pathDownList){ var out = getValueFromExistingSmartContract(instance, account, '0xD0e477451BCc5fD132f877F965958c4bC581fbd1', Coin_Moss, 'totalSupply', [], outputTypeList, chainInfo, setChainInfo, [], []); if (out.checked){return out[0];}else{return defaultValue(outputTypeList[0], pathDownList)}}([{t:'UInteger'}], [])))).toNumber() / (10 ** ethers.BigNumber.from('0').toNumber())).toFixed(ethers.BigNumber.from('2').toNumber() > 100 ? 100 : ethers.BigNumber.from('2').toNumber())}</span><span key={2} style={{color:'rgb(20, 255, 236)'}}><b><span style={{backgroundColor:'rgb(32, 33, 36)'}}><span style={{fontSize:'21.71px'}}><span style={{fontFamily:'arial, sans-serif'}}>   ‰</span></span></span></b></span>
							</div>
						</div>
					</div></div>
				</div></div>
			</div>
			<div style={{position:'relative', width:'100vw', overflow:'hidden', zIndex:0, backgroundColor:''}}>
				<div><div className=' container-fluid'>
					<div><div className='row justify-content-start align-items-start'>
						<div className=' col-12'/>
					</div></div>
					<div><div className='row justify-content-center align-items-start'>
						<div className=' col-11 col-md-8'><div style={{backgroundColor:'rgb(251, 169, 44)', borderStyle:'none', borderWidth:1, borderColor:'rgb(0,0,0)', borderRadius:'0.80em'}} className=' container-fluid'>
							<div><div className='row justify-content-start align-items-start'>
								<div className=' col-12 text-center' style={{borderWidth:0, padding:10}}>
									<div key={0}><span key={0} style={{color:'rgb(142, 50, 0)'}}><b><span style={{fontSize:'25.56px'}}>AI做市</span></b></span>
									</div>
								</div>
								<div className=' col-12 text-left' style={{borderWidth:0, padding:10}}><span key={0} style={{color:'rgb(0, 9, 44)'}}><b><span style={{fontSize:'0.85em'}}>1、支付 100 MOSS 代币，获得一张做市认证NFT。该NFT用于分红和挖矿，也可用于市场交易。</span></b></span><br/>
								</div>
							</div></div>
							<div><div className='row justify-content-center align-items-start'>
								<button style={{fontWeight:'bold', borderColor:'rgb(0,0,0)', borderWidth:3, borderStyle:'solid', borderRadius:'10.24em', cursor:'pointer'}} className='btn btn-normalDarkGrey btn-lg col-5'  onClick={clickActionfe_c95_7953d46c__s_c0_d60c01aa_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c0_f3415538_i_c138_a5888f97} >{'做市'}</button>
							</div></div>
							<div><div className='row justify-content-start align-items-start'>
								<div className=' col-12text-left' style={{borderWidth:0, padding:10}}>
									<div key={0}><span key={0} style={{color:'rgb(0, 9, 44)'}}><b><span style={{fontSize:'13.25px'}}>2、</span></b></span><span key={1} style={{color:'rgb(178, 6, 0)'}}><b><span style={{fontSize:'13.25px'}}>NFT每天可以产生1%的USDT做市收益。</span></b></span><span key={2} style={{color:'rgb(0, 9, 44)'}}><b><span style={{fontSize:'13.25px'}}>每一张NFT都能获得收益。张数越多，收益就越大。</span></b></span>
									</div>
									<div key={1}><span key={0} style={{color:'rgb(0, 9, 44)'}}><b><span style={{fontSize:'13.25px'}}>3、NFT开盘后既可分红U，还可以参与后续生态。</span></b></span>
									</div>
									<div key={2}><span key={0} style={{color:'rgb(0, 9, 44)'}}><b><span style={{fontSize:'13.25px'}}>3、</span></b></span><span key={1} style={{color:'rgb(178, 6, 0)'}}><b><span style={{fontSize:'13.25px'}}>做市收益需要自己用NFT质押后再领取，</span></b></span><span key={2} style={{color:'rgb(0, 9, 44)'}}><b><span style={{fontSize:'13.25px'}}>详情请点击下方&lt;进入质押提取页面&gt;按钮。</span></b></span>
									</div>
								</div>
							</div></div>
							<div><div className='row justify-content-center align-items-start'>
								<button style={{fontWeight:'bold', textDecoration:'underline', borderColor:'rgb(0,0,0)', borderWidth:1, borderStyle:'dashed', borderRadius:'21.01em', cursor:'pointer'}} className='btn btn-outline-link col-8'  onClick={clickActionfe_c95_7953d46c__s_c0_d60c01aa_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c0_7cc0b9a6_i_c36_05592e73} ><Icon height={'20px'} icon={'bi:arrow-return-right'} /> {'进入质押提取页面'}</button>
							</div></div>
							<div><div className='row justify-content-center align-items-start'>
								<div className=' col-10 text-center' style={{borderWidth:0, padding:10}}>  
								</div>
							</div></div>
						</div></div>
					</div></div>
					<div><div className='row justify-content-center align-items-start'>
						<div className=' col-12'/>
						<div className=' col-3 text-left' style={{borderWidth:0, padding:10}}>   
						</div>
					</div></div>
				</div></div>
			</div>{footer}</div>
	}else if (whichScreen === 'c95_065132f3'){
		return <div style={{color:'rgb(255, 251, 251)', backgroundColor:'rgb(31, 31, 31)'}}>{nav_c8_af50f325()}
			<div style={{position:'relative', width:'100vw', overflow:'hidden', zIndex:0, backgroundColor:''}}>
				<div><div className=' container-fluid'>
					<div><div className='row justify-content-start align-items-start'>
						<div className=' col-12'/>
						<button style={{fontWeight:'bold', cursor:'pointer'}} className='btn btn-outline-primary col-4'  onClick={clickActionfe_c95_065132f3__s_c0_11592b01_k_c0_b3594fd4_i_c0_316188f0_i_c168_463fb4b1} ><Icon height={'20px'} icon={'bi:chevron-left'} /> {'回到首页'}</button>
					</div></div>
					<div><div className='row justify-content-center align-items-start'>
						<div className=' col-11 col-md-8 text-center' style={{borderWidth:0, padding:10}}><span key={0} style={{color:'rgb(251, 169, 44)'}}><span style={{fontSize:'75px'}}><span style={{fontFamily:'Sonsie One'}}>MOSS</span></span></span><span key={1} style={{color:'rgb(251, 169, 44)'}}><span style={{fontSize:'60px'}}><span style={{fontFamily:'Lobster'}}>铸币</span></span></span><br/>
						</div>
					</div></div>
					<div><div className='row justify-content-center align-items-start'>
						<div><Countdown style={{backgroundColor:'rgb(210, 19, 239)', time:ethers.BigNumber.from('1682870400'), reverse:true, stopAt0:true}}/></div>
					</div></div>
				</div></div>
			</div>
			<div style={{position:'relative', width:'100vw', overflow:'hidden', zIndex:0, backgroundColor:''}}>
				<div><div className=' container-fluid'>
					<div><div className='row justify-content-start align-items-start'>
						<div className=' col-12'/>
					</div></div>
					<div><div className='row justify-content-center align-items-start'>
						<div className=' col-11 col-md-8'><div style={{backgroundColor:'rgb(251, 169, 44)', borderStyle:'none', borderWidth:1, borderColor:'rgb(0,0,0)', borderRadius:'0.80em'}} className=' container-fluid'>
							<div><div className='row justify-content-start align-items-start'>
								<div className=' col-12 text-center' style={{borderWidth:0, padding:10}}>
									<div key={0}><span key={0} style={{color:'rgb(142, 50, 0)'}}><b><span style={{fontSize:'25.56px'}}>AI铸币</span></b></span>
									</div>
								</div>
								<div className=' col-12 text-center' style={{borderWidth:0, padding:10}}><b key={0}><span style={{fontSize:'0.8em'}}>当前铸造总量：</span></b>
									<span key={1} style={{fontSize:'2.87em', fontFamily:'Abhaya Libre', color:'rgb(238, 238, 238)', fontWeight:'bold', fontStyle:'italic'}}>{(ethers.BigNumber.from('18').gt(ethers.BigNumber.from('2')) ? function(outputTypeList, pathDownList){ var out = getValueFromExistingSmartContract(instance, account, '0xD0e477451BCc5fD132f877F965958c4bC581fbd1', Coin_Moss, 'totalSupply', [], outputTypeList, chainInfo, setChainInfo, [], []); if (out.checked){return out[0];}else{return defaultValue(outputTypeList[0], pathDownList)}}([{t:'UInteger'}], []).div(ethers.BigNumber.from('10').pow(ethers.BigNumber.from('18').sub(ethers.BigNumber.from('2')))).toNumber()/(10 ** ethers.BigNumber.from('2').toNumber()) : function(outputTypeList, pathDownList){ var out = getValueFromExistingSmartContract(instance, account, '0xD0e477451BCc5fD132f877F965958c4bC581fbd1', Coin_Moss, 'totalSupply', [], outputTypeList, chainInfo, setChainInfo, [], []); if (out.checked){return out[0];}else{return defaultValue(outputTypeList[0], pathDownList)}}([{t:'UInteger'}], []).toNumber() / (10 ** ethers.BigNumber.from('18').toNumber())).toFixed(ethers.BigNumber.from('2').toNumber() > 100 ? 100 : ethers.BigNumber.from('2').toNumber())}</span>
								</div>
							</div></div>
							<div><div className='row justify-content-center align-items-start'>
								<div  className=' col-9 ml-0 mr-0' style={{padding:'0'}}><DecimalInputRecall defaultValue={0} className='form-control text-center' style={{placeholder:'输入要铸币的数量', backgroundColor:'rgb(238, 238, 238)', color:'rgb(0, 0, 0)', borderStyle:'solid', borderWidth:4, borderColor:'rgb(0,0,0)', borderRadius:'3.70em', disabled:false}} gVs={[]} setInputValues={setInputValues} inputValues={inputValues} idNos={'fe c95_065132f3 _s c0_d60c01aa k c0_4209f3d9 i c0_241bb32f i c0_95116a74 i c0_e08bf6dc i c57_b0778134'}/>{function(){ var p = []; var valueOut = inputValues['fe c95_065132f3 _s c0_d60c01aa k c0_4209f3d9 i c0_241bb32f i c0_95116a74 i c0_e08bf6dc i c57_b0778134']; if (!isDecimalText(valueOut) && valueOut){ p.push('Not a Decimal');};  if (p.length > 0){ return <center><p style={{color:'red'}}>{p.join(', ')}</p></center>}else{ return null; }}()}</div>
								<div className=' col-9 text-left' style={{borderWidth:0, padding:10}}>    
								</div>
							</div></div>
							<div><div className='row justify-content-center align-items-start'>
								<button style={{fontWeight:'bold', borderColor:'rgb(0,0,0)', borderWidth:3, borderStyle:'solid', borderRadius:'10.24em', cursor:'pointer'}} className='btn btn-dark btn-lg col-5'  onClick={clickActionfe_c95_065132f3__s_c0_d60c01aa_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c0_f3415538_i_c59_4f420c78} >{'铸币'}</button>
							</div></div>
							<div><div className='row justify-content-start align-items-start'>
								<div className=' col-12text-left' style={{borderWidth:0, padding:10}}>
									<div key={0}><br/>
									</div>
									<div key={1}><span key={0} style={{color:'rgb(0, 9, 44)'}}><b><span style={{fontSize:'13.25px'}}>1、铸币价格为 1 MOSS = 1 USDT 。</span></b></span>
									</div>
									<div key={2}><span key={0} style={{color:'rgb(0, 9, 44)'}}><b><span style={{fontSize:'13.25px'}}>2、铸币上限为100万，停止铸币的截至时期为2023年5月1日（上线日），开盘之后将无法铸币。</span></b></span>
									</div>
									<div key={3}><span key={0} style={{color:'rgb(0, 9, 44)'}}><b><span style={{fontSize:'13.25px'}}>3、铸币数量没有限制，多少都可以，直接进钱包。</span></b></span>
									</div>
								</div>
								<div className=' col-12 text-center' style={{borderWidth:0, padding:10}}>您的MOSS余额：
									<span key={1}>{(ethers.BigNumber.from('18').gt(ethers.BigNumber.from('4')) ? function(outputTypeList, pathDownList){ var out = getValueFromExistingSmartContract(instance, account, '0xD0e477451BCc5fD132f877F965958c4bC581fbd1', Coin_Moss, 'balanceOf', [{t:'Address'}], outputTypeList, chainInfo, setChainInfo, [], account, []); if (out.checked){return out[0];}else{return defaultValue(outputTypeList[0], pathDownList)}}([{t:'UInteger'}], []).div(ethers.BigNumber.from('10').pow(ethers.BigNumber.from('18').sub(ethers.BigNumber.from('4')))).toNumber()/(10 ** ethers.BigNumber.from('4').toNumber()) : function(outputTypeList, pathDownList){ var out = getValueFromExistingSmartContract(instance, account, '0xD0e477451BCc5fD132f877F965958c4bC581fbd1', Coin_Moss, 'balanceOf', [{t:'Address'}], outputTypeList, chainInfo, setChainInfo, [], account, []); if (out.checked){return out[0];}else{return defaultValue(outputTypeList[0], pathDownList)}}([{t:'UInteger'}], []).toNumber() / (10 ** ethers.BigNumber.from('18').toNumber())).toFixed(ethers.BigNumber.from('4').toNumber() > 100 ? 100 : ethers.BigNumber.from('4').toNumber())}</span>
								</div>
							</div></div>
						</div></div>
					</div></div>
					<div><div className='row justify-content-start align-items-start'>
						<div className=' col-12'/>
						<div className=' col-12'/>
						<div className=' col-12 text-left' style={{borderWidth:0, padding:10}}>    
						</div>
					</div></div>
				</div></div>
			</div>{footer}</div>
	}else if (whichScreen === 'c97_54039c72'){
		return <div style={{color:'rgb(255, 251, 251)', backgroundColor:'rgb(31, 31, 31)'}}>{nav_c8_af50f325()}
			<div style={{position:'relative', width:'100vw', overflow:'hidden', zIndex:0, backgroundColor:''}}>
				<div><div className=' container-fluid'>
					<div><div className='row justify-content-start align-items-start'>
						<div className=' col-12'/>
						<button style={{fontWeight:'bold', cursor:'pointer'}} className='btn btn-outline-primary col-3'  onClick={clickActionfe_c97_54039c72__s_c0_11592b01_k_c0_b3594fd4_i_c0_316188f0_i_c169_563b05a2} >{'回到首页'}</button>
					</div></div>
					<div><div className='row justify-content-center align-items-start'>
						<div className=' col-11 col-md-8 text-center' style={{borderWidth:0, padding:10}}><span key={0} style={{color:'rgb(251, 169, 44)'}}><span style={{fontSize:'75px'}}><span style={{fontFamily:'Sonsie One'}}>MOSS</span></span></span><span key={1} style={{color:'rgb(251, 169, 44)'}}><span style={{fontSize:'60px'}}><span style={{fontFamily:'Lobster'}}>个人中心</span></span></span><br/>
						</div>
					</div></div>
					<div><div className='row justify-content-start align-items-start'>
						<div className=' col-6 col-md-8 text-center' style={{borderWidth:0, padding:10}}><span key={0} style={{color:'#eeeeee'}}><b><span style={{fontSize:'17.1px'}}><span style={{fontFamily:'Arvo'}}>在个人中心，你可以查看自己的邀请链接，复制后然后发送给好友绑定。推荐好友可以获得他们铸币成本的10%，你可以随时提取推荐奖励，快速组建你的队伍出发吧！</span></span></b></span>
						</div>
						<div  className=' col-6 ml-0 mr-0'><img alt='generatedImage' src={'https://www.cues.sg/client_pictures/342_BqCla7Kg.png'} style={{borderWidth:0, width:'100%'}}/></div>
					</div></div>
				</div></div>
			</div>
			<div style={{position:'relative', width:'100vw', overflow:'hidden', zIndex:0, backgroundColor:''}}>
				<div><div className=' container-fluid'>
					<div><div className='row justify-content-start align-items-start'>
						<div className=' col-12'/>
					</div></div>
					<div><div className='row justify-content-center align-items-start'>
						<div className=' col-11 col-md-8'><div style={{backgroundColor:'rgb(251, 169, 44)', borderStyle:'none', borderWidth:1, borderColor:'rgb(0,0,0)', borderRadius:'0.80em'}} className=' container-fluid'>
							<div><div className='row justify-content-start align-items-start'>
								<div className=' col-12 text-center' style={{borderWidth:0, padding:10}}>
									<div key={0}><span key={0} style={{color:'rgb(142, 50, 0)'}}><b><span style={{fontSize:'25.56px'}}>个人中心</span></b></span>
									</div>
								</div>
								<div className=' col-12 text-center' style={{borderWidth:0, padding:10}}><span key={0} style={{color:'rgb(0, 9, 44)'}}><b><span style={{fontSize:'18.64px'}}>我的邀请链接</span></b></span>
								</div>
							</div></div>
							<div><div className='row justify-content-center align-items-start'>
								<div className=' col-12 text-center' style={{backgroundColor:'rgb(238, 238, 238)', borderColor:'rgb(0,0,0)', borderWidth:1, borderStyle:'dashed', borderRadius:'4.09em', padding:10}}>
									<span key={0} style={{color:'rgb(0, 0, 0)'}}>{('https://mosscoin.info/?moss=' + account)}</span><br/>
								</div>
							</div></div>
							<div><div className='row justify-content-center align-items-start'>
								<div className=' col-12 text-center' style={{borderWidth:0, padding:10}}><span key={0} style={{color:'rgb(178, 6, 0)'}}><span style={{fontSize:'0.8em'}}>*如果复制不成功，请长按文字再复制</span></span>
								</div>
								<button style={{borderColor:'rgb(0,0,0)', borderWidth:1, borderStyle:'solid', borderRadius:'10.24em', cursor:'pointer'}} className='btn btn-link col-5'  onClick={clickActionfe_c97_54039c72__s_c0_d60c01aa_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c0_f3415538_i_c59_4f420c78} >{'复制'}</button>
							</div></div>
							<div><div className='row justify-content-center align-items-start'>
								<div className=' col-12 text-center' style={{borderWidth:0, padding:10}}><span key={0} style={{color:'rgb(0, 9, 44)'}}><b><span style={{fontSize:'1.1em'}}>我的铸币推荐奖励</span></b></span>
								</div>
								<div className=' col-12 text-center' style={{borderWidth:0, padding:10}}>
									<span key={0}>{(ethers.BigNumber.from('18').gt(ethers.BigNumber.from('4')) ? function(outputTypeList, pathDownList){ var out = getValueFromExistingSmartContract(instance, account, '0xD0e477451BCc5fD132f877F965958c4bC581fbd1', Coin_Moss, 'referralRecordMap', [{t:'Address'}], outputTypeList, chainInfo, setChainInfo, [], account, []); if (out.checked){return out[2];}else{return defaultValue(outputTypeList[2], pathDownList)}}([{t:'Boolean'}, {t:'Address'}, {t:'UInteger'}], []).div(ethers.BigNumber.from('10').pow(ethers.BigNumber.from('18').sub(ethers.BigNumber.from('4')))).toNumber()/(10 ** ethers.BigNumber.from('4').toNumber()) : function(outputTypeList, pathDownList){ var out = getValueFromExistingSmartContract(instance, account, '0xD0e477451BCc5fD132f877F965958c4bC581fbd1', Coin_Moss, 'referralRecordMap', [{t:'Address'}], outputTypeList, chainInfo, setChainInfo, [], account, []); if (out.checked){return out[2];}else{return defaultValue(outputTypeList[2], pathDownList)}}([{t:'Boolean'}, {t:'Address'}, {t:'UInteger'}], []).toNumber() / (10 ** ethers.BigNumber.from('18').toNumber())).toFixed(ethers.BigNumber.from('4').toNumber() > 100 ? 100 : ethers.BigNumber.from('4').toNumber())}</span>  <span key={2} style={{color:'rgb(178, 6, 0)'}}><b>USDT</b></span>
								</div>
								<div  className=' col-6' style={{padding:'0'}}><DecimalInputRecall defaultValue={0} className='form-control text-left' style={{placeholder:'输入USDT数量', disabled:false}} gVs={[]} setInputValues={setInputValues} inputValues={inputValues} idNos={'fe c97_54039c72 _s c0_d60c01aa k c0_4209f3d9 i c0_241bb32f i c0_95116a74 i c0_e12e6a26 i c73_d74a734e'}/>{function(){ var p = []; var valueOut = inputValues['fe c97_54039c72 _s c0_d60c01aa k c0_4209f3d9 i c0_241bb32f i c0_95116a74 i c0_e12e6a26 i c73_d74a734e']; if (!isDecimalText(valueOut) && valueOut){ p.push('Not a Decimal');};  if (p.length > 0){ return <center><p style={{color:'red'}}>{p.join(', ')}</p></center>}else{ return null; }}()}</div>
								<button style={{cursor:'pointer'}} className='btn btn-primary col-4'  onClick={clickActionfe_c97_54039c72__s_c0_d60c01aa_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c0_e12e6a26_i_c73_beb69b24} >{'领取'}</button>
								<button className='btn btn-link btn-lg col-3' ><Icon height={'20px'} icon={'logos:youtube-icon'} /> {''}</button>
								<button style={{cursor:'pointer'}} className='btn btn-link btn-lg col-3'  onClick={clickActionfe_c97_54039c72__s_c0_d60c01aa_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c0_e12e6a26_i_c86_e2b555b5} ><Icon height={'20px'} icon={'logos:telegram'} /> {''}</button>
							</div></div>
						</div></div>
					</div></div>
					<div><div className='row justify-content-start align-items-start'>
						<div className=' col-12'/>
						<div className=' col-12'/>
						<div className=' col-12 text-left' style={{borderWidth:0, padding:10}}>   
						</div>
					</div></div>
				</div></div>
			</div>{footer}</div>
	}else if (whichScreen === 'c42_8a189b10'){
		return <div style={{color:'rgb(255, 251, 251)', backgroundColor:'rgb(31, 31, 31)'}}>{nav_c8_af50f325()}
			<div style={{position:'relative', width:'100vw', overflow:'hidden', zIndex:0, backgroundColor:''}}>
				<div><div className=' container-fluid'>
					<div><div className='row justify-content-start align-items-start'>
						<div className=' col-12'/>
						<button style={{fontWeight:'bold', cursor:'pointer'}} className='btn btn-outline-primary col-3'  onClick={clickActionfe_c42_8a189b10__s_c44_e6e05431_k_c0_b3594fd4_i_c0_316188f0_i_c169_563b05a2} >{'回到首页'}</button>
					</div></div>
					<div><div className='row justify-content-center align-items-start'>
						<div className=' col-11 col-md-8 text-center' style={{borderWidth:0, padding:10}}><span key={0} style={{color:'rgb(251, 169, 44)'}}><span style={{fontSize:'75px'}}><span style={{fontFamily:'Sonsie One'}}>MOSS</span></span></span><span key={1} style={{color:'rgb(251, 169, 44)'}}><span style={{fontSize:'60px'}}><span style={{fontFamily:'Lobster'}}>质押提取</span></span></span><br/>
						</div>
					</div></div>
					<div><div className='row justify-content-center align-items-start'>
						<div className=' col-6 col-md-8 text-center' style={{borderWidth:0, padding:10}}><br/>
						</div>
						<div className=' col-12 text-center' style={{lineHeight:'1.67em', borderWidth:0, padding:10}}><span key={0} style={{color:'rgb(57, 62, 70)'}}><b><span style={{fontSize:'18px'}}><span style={{fontFamily:'Cabin'}}>平台NFT总质押数量</span></span></b></span>
							<div key={1}><br/>
							</div>
							<div key={2}>
								<span key={0} style={{color:'rgb(20, 255, 236)', fontWeight:'bold'}}>{function(x){try{return x.toString()}catch(err){return ''}}(function(outputTypeList, pathDownList){ var out = getValueFromExistingSmartContract(instance, account, '0xf1727Ae30F14FEfB4F48890C1a56cBC26Ca64677', MOSStaking, 'numberOfTokensCurrentlyStaked', [], outputTypeList, chainInfo, setChainInfo, [], []); if (out.checked){return out[0];}else{return defaultValue(outputTypeList[0], pathDownList)}}([{t:'UInteger'}], []))}</span><br/>
							</div>
						</div>
						<div className=' col-12 text-center' style={{lineHeight:'1.67em', borderWidth:0, padding:10}}><span key={0} style={{color:'#393e46'}}><b><span style={{fontSize:'18px'}}><span style={{fontFamily:'Cabin'}}>我参与质押数量</span></span></b></span><br/>
							<div key={2}><br/>
							</div>
							<div key={3}>
								<span key={0} style={{color:'rgb(20, 255, 236)', fontWeight:'bold'}}>{function(x){try{return x.toString()}catch(err){return ''}}(function(outputTypeList, pathDownList){ var out = getValueFromExistingSmartContract(instance, account, '0xf1727Ae30F14FEfB4F48890C1a56cBC26Ca64677', MOSStaking, 'numberOfStakedTokenIDsOfAnAddress', [{t:'Address'}], outputTypeList, chainInfo, setChainInfo, [], account, []); if (out.checked){return out[0];}else{return defaultValue(outputTypeList[0], pathDownList)}}([{t:'UInteger'}], []))}</span><br/>
							</div>
						</div>
						<div className=' col-12 text-center' style={{lineHeight:'1.67em', borderWidth:0, padding:10}}><span key={0} style={{color:'rgb(57, 62, 70)'}}><b><span style={{fontSize:'18px'}}><span style={{fontFamily:'Cabin'}}>我的钱包NFT余额</span></span></b></span>
							<div key={1}><br/>
							</div>
							<div key={2}>
								<span key={0} style={{color:'rgb(20, 255, 236)', fontWeight:'bold'}}>{function(x){try{return x.toString()}catch(err){return ''}}(function(outputTypeList, pathDownList){ var out = getValueFromExistingSmartContract(instance, account, '0xBf5F61642F5f64c7F94D17d64Ff050bDE3DB85a3', Nft_MOSS, 'balanceOf', [{t:'Address'}], outputTypeList, chainInfo, setChainInfo, [], account, []); if (out.checked){return out[0];}else{return defaultValue(outputTypeList[0], pathDownList)}}([{t:'UInteger'}], []))}</span>
							</div>
						</div>
					</div></div>
				</div></div>
			</div>
			<div style={{position:'relative', width:'100vw', overflow:'hidden', zIndex:0, backgroundColor:''}}>
				<div><div className=' container-fluid'>
					<div><div className='row justify-content-start align-items-start'>
						<div className=' col-12'/>
					</div></div>
					<div><div className='row justify-content-center align-items-start'>
						<div className=' col-11 col-md-8'><div style={{backgroundColor:'rgb(251, 169, 44)', borderStyle:'none', borderWidth:1, borderColor:'rgb(0,0,0)', borderRadius:'0.80em'}} className=' container-fluid'>
							<div><div className='row justify-content-start align-items-start'>
								<div className=' col-12 text-center' style={{borderWidth:0, padding:10}}><span key={0} style={{color:'#8e3200'}}><b><span style={{fontSize:'25.56px'}}>NFT质押提取</span></b></span>
								</div>
							</div></div>
							<div><div className='row justify-content-center align-items-start'>
								<div className=' col-12text-left' style={{borderWidth:0, padding:10}}>
									<div key={0}><span key={0} style={{color:'rgb(0, 0, 0)'}}><b><span style={{fontSize:'13.25px'}}>1、在下方输入框内输入NFT编号，后面的质押和提取都只操作你输入编号的NFT、&lt;质押&gt;成功后可获得每天1%的USDT收益。</span></b></span>
									</div>
									<div key={1}><span key={0} style={{color:'rgb(0, 0, 0)'}}><b><span style={{fontSize:'13.25px'}}>3、&lt;提取NFT&gt;提取NFT之后，NFT和USDT奖励都会回到你的钱包。</span></b></span>
									</div>
								</div>
							</div></div>
							<div><div className='row justify-content-center align-items-start'>
								<div  className=' col-3 ml-0 mr-2' style={{padding:'0'}}><UIntegerInputRecall defaultValue={ethers.BigNumber.from('0')} className='form-control text-left' style={{placeholder:'NFT编号', borderStyle:'dotted', borderWidth:1, borderColor:'rgb(0,0,0)', borderRadius:'4.86em', disabled:false}} gVs={[]} setInputValues={setInputValues} inputValues={inputValues} idNos={'fe c42_8a189b10 _s c44_57491d07 k c0_4209f3d9 i c0_241bb32f i c0_95116a74 i c53_696e57d1 i c57_cbbff574'}/>{function(){ var p = []; var valueOut = inputValues['fe c42_8a189b10 _s c44_57491d07 k c0_4209f3d9 i c0_241bb32f i c0_95116a74 i c53_696e57d1 i c57_cbbff574']; if (!isPositiveIntegerOrZeroText(valueOut) && valueOut){ p.push('Not a Positive Integer or Zero');};  if (p.length > 0){ return <center><p style={{color:'red'}}>{p.join(', ')}</p></center>}else{ return null; }}()}</div>
								<button style={{borderColor:'rgb(0,0,0)', borderWidth:1, borderStyle:'solid', borderRadius:'4.47em', cursor:'pointer'}} className='btn btn-danger col-3 ml-0 mr-2'  onClick={clickActionfe_c42_8a189b10__s_c44_57491d07_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c53_696e57d1_i_c53_6c35e493} >{'质押'}</button>
								<button style={{borderColor:'rgb(0,0,0)', borderWidth:1, borderStyle:'solid', borderRadius:'4.47em', cursor:'pointer'}} className='btn btn-info col-4'  onClick={clickActionfe_c42_8a189b10__s_c44_57491d07_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c53_696e57d1_i_c56_96375b52} >{'提取NFT'}</button>
							</div></div>
							<div><div className='row justify-content-center align-items-start'>
								<div className=' col-12text-left' style={{borderWidth:0, padding:10}}><span key={0} style={{color:'rgb(0, 0, 0)'}}><b><span style={{fontSize:'13.25px'}}>4、在下方输入框内输入你要提取的USDT数量，可以在不提取NFT的情况下随时随地领取收益。</span></b></span>
								</div>
							</div></div>
							<div><div className='row justify-content-center align-items-start'>
								<div  className=' col-4' style={{padding:'0'}}><DecimalInputRecall defaultValue={0} className='form-control text-left' style={{placeholder:'USDT数量', disabled:false}} gVs={[]} setInputValues={setInputValues} inputValues={inputValues} idNos={'fe c42_8a189b10 _s c44_57491d07 k c0_4209f3d9 i c0_241bb32f i c0_95116a74 i c53_282e3be4 i c63_b2dcdb8f'}/>{function(){ var p = []; var valueOut = inputValues['fe c42_8a189b10 _s c44_57491d07 k c0_4209f3d9 i c0_241bb32f i c0_95116a74 i c53_282e3be4 i c63_b2dcdb8f']; if (!isDecimalText(valueOut) && valueOut){ p.push('Not a Decimal');};  if (p.length > 0){ return <center><p style={{color:'red'}}>{p.join(', ')}</p></center>}else{ return null; }}()}</div>
								<button style={{cursor:'pointer'}} className='btn btn-primary col-6'  onClick={clickActionfe_c42_8a189b10__s_c44_57491d07_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c53_282e3be4_i_c63_a7547a7b} >{'领取USDT收益'}</button>
								<button style={{fontWeight:'bold', textDecoration:'underline', borderColor:'rgb(0,0,0)', borderWidth:1, borderStyle:'dashed', borderRadius:'21.01em', cursor:'pointer'}} className='btn btn-outline-link col-4'  onClick={clickActionfe_c42_8a189b10__s_c44_57491d07_k_c0_4209f3d9_i_c0_241bb32f_i_c0_95116a74_i_c53_282e3be4_i_c36_05592e73} ><Icon height={'20px'} icon={'fluent:arrow-enter-left-20-regular'} /> {'退出'}</button>
							</div></div>
							<div><div className='row justify-content-center align-items-start'>
								<div className=' col-10 text-center' style={{borderWidth:0, padding:10}}>您的做市USDT奖励：
									<span key={1}>{(ethers.BigNumber.from('18').gt(ethers.BigNumber.from('12')) ? function(outputTypeList, pathDownList){ var out = getValueFromExistingSmartContract(instance, account, '0xf1727Ae30F14FEfB4F48890C1a56cBC26Ca64677', MOSStaking, 'interestEarnedUpToNowBeforeTaxesAndNotYetWithdrawn', [{t:'UInteger'}], outputTypeList, chainInfo, setChainInfo, [], textToUInt(inputValues['fe c42_8a189b10 _s c44_57491d07 k c0_4209f3d9 i c0_241bb32f i c0_95116a74 i c53_696e57d1 i c57_cbbff574']), []); if (out.checked){return out[0];}else{return defaultValue(outputTypeList[0], pathDownList)}}([{t:'UInteger'}], []).div(ethers.BigNumber.from('10').pow(ethers.BigNumber.from('18').sub(ethers.BigNumber.from('12')))).toNumber()/(10 ** ethers.BigNumber.from('12').toNumber()) : function(outputTypeList, pathDownList){ var out = getValueFromExistingSmartContract(instance, account, '0xf1727Ae30F14FEfB4F48890C1a56cBC26Ca64677', MOSStaking, 'interestEarnedUpToNowBeforeTaxesAndNotYetWithdrawn', [{t:'UInteger'}], outputTypeList, chainInfo, setChainInfo, [], textToUInt(inputValues['fe c42_8a189b10 _s c44_57491d07 k c0_4209f3d9 i c0_241bb32f i c0_95116a74 i c53_696e57d1 i c57_cbbff574']), []); if (out.checked){return out[0];}else{return defaultValue(outputTypeList[0], pathDownList)}}([{t:'UInteger'}], []).toNumber() / (10 ** ethers.BigNumber.from('18').toNumber())).toFixed(ethers.BigNumber.from('12').toNumber() > 100 ? 100 : ethers.BigNumber.from('12').toNumber())}</span>
								</div>
							</div></div>
						</div></div>
					</div></div>
					<div><div className='row justify-content-center align-items-start'>
						<div className=' col-12'/>
						<div className=' col-3 text-left' style={{borderWidth:0, padding:10}}>   
						</div>
					</div></div>
				</div></div>
			</div>{footer}</div>
	}
}

export default App;
