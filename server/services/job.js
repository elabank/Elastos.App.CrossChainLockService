import timers from 'timers'
import web3 from 'services/web3'
import Tx from 'ethereumjs-tx'
import locks from 'locks'
import {
    PLATFORM_ETH_SIDECHAIN_PRIVKEY,
    PLATFORM_ETH_SIDECHAIN_ADDR,
    ETH_CONTRACT_ABI,
    ETH_CONTRACT_BYTECODE
} from 'config/config'
import {
    query,
    insert,
    update
} from 'services/db'


process.on('message', function(msg) {
    this._startTimer = function() {
        timers.setInterval(async function() {
                try {
                    // activity 0 to 1 check
                    const [activity0] = await query('select * from ccls_activity where status = 0');
                    for(var i=0;i<activity0.length;i++){
                        const [participators_num] = await query('select * from ccls_participators where contract_id = (select id from ccls_contracts where activity_id = ? limit 1)',[activity0[i].id]);
                        if(participators_num.length >= activity0[i].participant_num){
                            await update('update ccls_activity set status = ? where id= ?', [1,activity0[i].id])
                        }
                    }

                    // 4 is status unlocked
                    const [activity] = await query('select * from ccls_activity where status != 4');
                    for(var i=0;i<activity.length;i++){
                        const [contracts] = await query('select * from ccls_contracts where activity_id = ? limit 1',[activity[i].id]);
                        const contract_address = contracts[0].contract_address
                        if (contract_address != null){
                            const myContract = await new web3.eth.Contract(ETH_CONTRACT_ABI,contract_address)
                            const _ = await myContract.methods.getParticipators('0x0000000000000000000000000000000000000000').call({from: '0x8bd4ca7b65ac97f43aeb9d2e929ea65fe277890f'}, async function (error, result){
                                console.info("getParticipators",error,result);
                                if (!error){
                                    console.info("tokenParticipators result ", result)
                                    const [participators] = await query('select * from ccls_participators where status != 1 and  contract_id = ?',[contracts[0].id]);
                                    for(var i=0;i<participators.length;i++){
                                        if(result.includes(participators[i].participator_address)){
                                            await update('update ccls_participators set status = ? where id= ?', [1,participators[i].id])
                                        }
                                    }
                                }else{
                                    console.info("Error calling tokenParticipators result ")
                                }
                            });


                            await myContract.methods.lockStatus().call({from: '0x8bd4ca7b65ac97f43aeb9d2e929ea65fe277890f'}, async function (error, result){
                                if (!error){
                                    console.info("LockStatus result ", result)
                                    if(result == 1){
                                        const [_] = await update('update ccls_activity set status = ? where id= ?', [3,activity[i].id])
                                    }else if(result == 2){
                                        const [_] = await update('update ccls_activity set status = ? where id= ?', [4,activity[i].id])
                                    }
                                }else{
                                    console.info("Error calling lockStatus result ")
                                }
                            });
                        }
                    }

                    const [activityFinal] = await query('select * from ccls_activity where status = 4');
                    console.info('1111',activityFinal)
                    for(var i=0;i<activityFinal.length;i++){
                        let final_id = activityFinal[i].id
                        // unlock eth
                        const [contracts] = await query('select * from ccls_contracts where activity_id = ? limit 1',[final_id]);
                        const contract_address = contracts[0].contract_address
                        const [rows] = await query('select * from ccls_participators where contract_id = ? and status = 2',contracts[0].id);
                        let participators = []
                        for(var m = 0;m<rows.length;m++){
                            participators.push(rows[m].participator_address)
                        }

                        const privateKey = new Buffer(PLATFORM_ETH_SIDECHAIN_PRIVKEY, 'hex');
                        const nonce = await web3.eth.getTransactionCount(PLATFORM_ETH_SIDECHAIN_ADDR);
                        const contract = new web3.eth.Contract(ETH_CONTRACT_ABI,contract_address);
                        console.info('0x0000000000000000000000000000000000000000',participators)
                        const cdata = contract.methods.batchRelease('0x0000000000000000000000000000000000000000',participators).encodeABI()

                        let tx1 = {
                            from: PLATFORM_ETH_SIDECHAIN_ADDR,
                            data: cdata,
                            to:contract_address,
                        };
                        let gas = await web3.eth.estimateGas(tx1);
                        let gasPrice = await web3.eth.getGasPrice();
                        let rawTx = {
                            from:PLATFORM_ETH_SIDECHAIN_ADDR,
                            nonce:  nonce,
                            to:contract_address,
                            gas:web3.utils.toHex(gas),
                            gasLimit : web3.utils.toHex(gas),
                            gasPrice: web3.utils.toHex(gasPrice),
                            data: cdata,
                        };
                        const tx = new Tx(rawTx);
                        tx.sign(privateKey);
                        const serializedTx = tx.serialize();
                        const txHash = await web3.utils.sha3(serializedTx);
                        console.info(txHash);
                        await web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')).once('confirmation', async function(confNumber, receipt){
                            console.info("Get Receipt : ",receipt)
                            const [______] = await update('update ccls_activity set status = 5 where id = ?', [final_id])
                        }).on('error',function (err) {
                            console.info(err)
                        });
                    }
                } catch (err) {
                    console.info("Job Task Error",err)
                }
        }, msg.interval);
    };
    this._init = function() {
        if (msg.content != null || msg.content != "" && msg.start == true) {
            this._startTimer();
        } else {
            console.log("Unable to start timer.");
        }
    }.bind(this)()
})