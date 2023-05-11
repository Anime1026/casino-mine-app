import React, { useEffect, useState } from 'react';
import uniqid from 'uniqid';
import { io } from 'socket.io-client';
import Card from '../../components/Card';
import MineBox from '../../components/MineBox';
import AmountBox from '../../components/AmountBox';
import BetButton from '../../components/BetButton';
import ToggleBox from '../../components/ToggleBox';
import ProfitBox from '../../components/ProfitBox';
import SettingBtn from '../../components/SettingBtn';
import Modal from '../../components/Modal';
import GridIcon from '../../assets/images/grid_icon.svg';
import CricketIcon from '../../assets/images/cricket_icon.svg';
import useStore from '../../useStore';
import { config } from '../../config/global.const';
import { postRequest } from '../../service';
import './gamemanager.scss';

const socket = io(config.wwsHost as string);
const GameManager = () => {
  const { auth, update } = useStore();
  const [loading, setLoading] = useState(false);
  const [playStatus, setPlayStatus] = useState(false);
  const [btnActionStatus, setBtnActionStatus] = useState('start');
  const [gridSettingList, setGridSettingList] = useState([
    { label: '3X3', grid: 3, active: false },
    { label: '5X5', grid: 5, active: true },
    { label: '7X7', grid: 7, active: false },
    { label: '9X9', grid: 9, active: false }
  ]);
  const [totalValue, setTotalValue] = useState(auth?.balance);
  const [gridDataList, setGridDataList] = useState([]);
  const [gridCount, setGridCount] = useState(5);
  const [betAmount, setBetAmount] = useState<number>(1);
  const [mineCount, setMineCount] = useState(1);

  const [turboMode, setTurboMode] = useState(false);
  const [turboList, setTurboList] = useState([]);
  const [currentTarget, setCurrentTarget] = useState(-1);
  const [cardLoading, setCardLoading] = useState(false);
  const [profitCalcList, setProfitCalcList] = useState([]);
  const [profitCalcTextList, setProfitCalcTextList] = useState([]);
  const [currentProfit, setCurrentProfit] = useState(0);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [settingModalOpen, setSettingModalOpen] = useState(false);

  const makeNewUser = () => {
    let data = {
      name: uniqid(),
      img: uniqid(),
      balance: 1000
    };
    setTotalValue(1000);
    postRequest(`/register`, data).then((res: any) => {
      if (res.status) {
        update({ auth: { ...res.data } } as StoreObject);
      }
    });
  };

  const initializeGridSystem = (count: number) => {
    let data: any = [];
    for (let e = 0; e < count * count; e++) {
      data.push({ price: 0, active: false, turbo: false, mine: false });
    }
    setGridDataList(data);
  };

  const handleBetButton = () => {
    if (loading || cardLoading) {
      return;
    }
    if (auth) {
      switch (btnActionStatus) {
        case 'start':
          if (turboMode && turboList.length === 0) return;
          if (!turboMode) setCurrentProfit(0);
          initializeGridSystem(gridCount);
          setLoading(true);
          setCardLoading(true);
          setTimeout(() => {
            socket.emit('playBet', {
              userid: auth?.userid,
              betAmount,
              gridCount,
              mineCount,
              turboMode,
              turboList,
              profitValue: profitCalcList[currentProfit - 1]
            });
            setPlayStatus(true);
          }, 1000);
          break;
        case 'cancel':
          socket.emit('cancelBet', {
            userid: auth?.userid,
            betAmount
          });
          setPlayStatus(false);
          break;
        case 'cashOut':
          setLoading(true);
          setTimeout(() => {
            socket.emit('cashOut', { userid: auth?.userid, profitValue: profitCalcList[currentProfit - 1] });
          }, 1000);
          break;
      }
    } else {
      alert('Undefined user');
    }
  };

  const setGridSystem = (count: number, ind: number) => {
    if (playStatus) return;

    if (auth) {
      let data = gridSettingList.map((item: any, index: number) => {
        if (index === ind) return { ...item, active: true, mine: null };
        else return { ...item, active: false, mine: null };
      });
      setGridSettingList(data);
      setGridCount(count);
    } else {
      alert('Undefined user');
    }
  };

  const checkMine = (order: number) => {
    if (auth) {
      if (turboMode) {
        let grids: any = [...gridDataList];
        let turbos: any = [...turboList];
        if (grids[order].turbo) {
          grids[order].turbo = false;
          turbos.splice(turbos.indexOf(order), 1);
        } else {
          if (turboList.length >= gridCount * gridCount - mineCount) return;
          grids[order].turbo = true;
          turbos.push(order);
        }

        setCurrentProfit(turboList.length);
        setTurboList(turbos);
        setGridDataList(grids);
        setCurrentTarget(order);
      } else {
        if (!playStatus || cardLoading) return;
        setCurrentTarget(order);
        setCardLoading(true);
        socket.emit('checkMine', { userid: auth?.userid, order });
      }
    } else {
      alert('Undefined user');
    }
  };

  useEffect(() => {
    switch (gridCount) {
      case 3:
        setMineCount(2);
        break;
      case 5:
        setMineCount(3);
        break;
      case 7:
        setMineCount(5);
        break;
      case 9:
        setMineCount(10);
        break;
    }
  }, [gridCount]);

  useEffect(() => {
    setCurrentTarget(-1);
    setTurboList([]);
    initializeGridSystem(gridCount);
    setTimeout(() => {
      socket.emit('setProfitCalcList', { userid: auth?.userid, mineCount, gridCount });
    }, 100);

    return () => {
      socket.off('setProfitCalcList');
    };
  }, [mineCount, turboMode]);

  useEffect(() => {
    socket.on(`checkMine-${auth?.userid}`, async (e) => {
      let data: any = [...gridDataList];
      if (e.mine) {
        setTimeout(() => {
          e.minePlace.map((item: number) => {
            data[item].mine = true;
            data[item].active = true;
          });
          setCardLoading(false);
          setBtnActionStatus('start');
          setPlayStatus(false);
          setCurrentProfit(0);
        }, 1000);
        setTimeout(() => {
          initializeGridSystem(gridCount);
        }, 3000);
      } else {
        data[e.index].mine = e.mine;
        data[e.index].active = true;
        setTimeout(() => {
          setCardLoading(false);
          setCurrentProfit((prevState) => prevState + 1);
          setBtnActionStatus('cashOut');
        }, 1000);
      }
      setGridDataList(data);
    });
    socket.on(`playBet-${auth?.userid}`, async (e) => {
      if (e.turboMode) {
        let data: any = [...gridDataList];

        const count = turboList.filter((item1) => e.gridSystem[item1]).length;
        turboList.map((item1: number) => {
          data[item1].active = true;
        });
        if (count > 0) {
          e.gridSystem.map((item2: number, ind: number) => {
            if (item2) {
              data[ind].mine = true;
              data[ind].active = true;
            }
          });
        } else {
          setResultModalOpen(true);
        }

        setPlayStatus(false);
        setBtnActionStatus('start');
        setGridDataList(data);

        setTimeout(() => {
          setResultModalOpen(false);
        }, 2000);

        setTimeout(() => {
          initializeGridSystem(gridCount);
        }, 2000);
      } else {
        setBtnActionStatus('cancel');
      }
      setTotalValue(e.balance);
      update({ auth: { ...auth, balance: e.balance } } as StoreObject);
      setCardLoading(false);
      setLoading(false);
    });
    return () => {
      socket.off(`playBet-${auth?.userid}`);
      socket.off(`checkMine-${auth?.userid}`);
    };
  }, [gridDataList]);

  useEffect(() => {
    socket.on(`setProfitCalcList-${auth?.userid}`, async (e) => {
      setProfitCalcList(e.profitCalcList);
      let data = e.profitCalcList.map((item: number) => {
        let value: any = item;
        if (value >= 1000 && value < 1000000) {
          value = `${(item / 1000).toFixed(2)}K`;
        } else if (value >= 1000000 && value < 1000000000) {
          value = `${(item / 1000000).toFixed(2)}M`;
        } else if (value >= 1000000000) {
          value = `${(item / 1000000000).toFixed(2)}G`;
        } else {
          value = item;
        }
        return { value: value, active: false };
      });
      setProfitCalcTextList(data);
    });

    return () => {
      socket.off(`setProfitCalcList-${auth?.userid}`);
    };
  }, [profitCalcList, profitCalcTextList]);

  useEffect(() => {
    if (!auth || !auth?.balance || Number(auth?.balance) <= 0) makeNewUser();

    if (auth) socket.emit('join', auth);

    socket.on(`cancelBet-${auth?.userid}`, async (e) => {
      setTotalValue(e.balance);
      update({ auth: { ...auth, balance: e.balance } } as StoreObject);
      setLoading(false);
      setBtnActionStatus('start');
    });

    socket.on(`cashOut-${auth?.userid}`, async (e) => {
      setTotalValue(e.balance);
      update({ auth: { ...auth, balance: e.balance } } as StoreObject);
      setResultModalOpen(true);
      setPlayStatus(false);
      initializeGridSystem(gridCount);
      setBtnActionStatus('start');
      setLoading(false);

      setTimeout(() => {
        setCurrentProfit(0);
        setResultModalOpen(false);
      }, 2000);
    });

    socket.on(`error-${auth?.userid}`, async (e) => {
      alert(e);
    });

    return () => {
      socket.off('join');
      socket.off(`cancelBet-${auth?.userid}`);
      socket.off(`cashOut-${auth?.userid}`);
      socket.off(`error-${auth?.userid}`);
    };
  }, [auth]);

  return (
    <>
      <div className="game-management-layout">
        <div className="game-landscape-top">
          <div className="logo-container" />
          <div className="profit-list-container">
            <div className="history">
              <div
                className="history-inner"
                style={{
                  gridTemplateColumns: `repeat(${
                    profitCalcList.length > 8 ? 8 : profitCalcList.length
                  }, minmax(0, 1fr))`
                }}
              >
                {profitCalcTextList.slice(0, 8).map((item: any, ind: number) => {
                  return (
                    <ProfitBox
                      key={ind}
                      ind={ind}
                      playStatus={playStatus}
                      item={item}
                      turboMode={turboMode}
                      profitCalcList={profitCalcList}
                      currentProfit={currentProfit}
                    />
                  );
                })}
              </div>
            </div>
          </div>
          <div className="balance-container">
            <label>Balance</label>
            <div className="balance">
              <span>${totalValue?.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="game-landscape-content">
          <div className="game-landscape-setting-info flex slg:hidden">
            <div className="game-landscape-setting-info-inner">
              <div className="setting-item">
                <div className="setting-icon">
                  <img src={GridIcon} alt="grid" />
                </div>
                <div className="setting-value">{`${gridCount}X${gridCount}`}</div>
              </div>
              <div className="setting-item">
                <div className="setting-icon">
                  <img src={CricketIcon} alt="cricket" />
                </div>
                <div className="setting-value">{mineCount}</div>
              </div>
            </div>
          </div>
          <div
            className="game-landscape-card-group"
            style={{ gridTemplateColumns: `repeat(${gridCount}, minmax(0, 1fr))` }}
          >
            {gridDataList.map((item: any, ind: number) => {
              return (
                <div key={ind} onClick={() => checkMine(ind)}>
                  <Card
                    turboMode={turboMode}
                    turbo={item.turbo}
                    turboList={turboList}
                    loading={cardLoading}
                    playStatus={playStatus}
                    active={item.active}
                    mine={item.mine}
                    self={ind}
                    currentTarget={currentTarget}
                  />
                </div>
              );
            })}
          </div>
          <div className="game-landscape-size">
            <div className="game-landscape-size-list">
              {gridSettingList.map((item: any, ind: number) => {
                return (
                  <div
                    key={ind}
                    className={`game-landscape-size-item ${item.active ? '_active !cursor-default' : '_hover'} ${
                      playStatus && !item.active && '_disabled'
                    }`}
                    onClick={() => setGridSystem(item.grid, ind)}
                  >
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="game-landscape-size-title">Grid</div>
          </div>
          <div className="mobile-game-controller">
            {/* <div className="profit-list-container">
              <div className="history">
                <div
                  className="history-inner"
                  style={{
                    gridTemplateColumns: `repeat(${
                      profitCalcList.length > 8 ? 8 : profitCalcList.length
                    }, minmax(0, 1fr))`
                  }}
                >
                  {profitCalcTextList.slice(0, 8).map((item: any, ind: number) => {
                    return (
                      <ProfitBox
                        key={ind}
                        ind={ind}
                        playStatus={playStatus}
                        item={item}
                        turboMode={turboMode}
                        profitCalcList={profitCalcList}
                        currentProfit={currentProfit}
                      />
                    );
                  })}
                </div>
              </div>
            </div> */}
            <div className="amount-controller">
              <AmountBox
                isMobile="mobile"
                minLimit={0.1}
                maxLimit={100}
                value={betAmount}
                setValue={(e: number) => !playStatus && setBetAmount(e)}
                playStatus={playStatus}
              />
            </div>
            <div className="btn-controller">
              <div>
                <ToggleBox
                  isMobile={true}
                  value={turboMode}
                  setValue={(e: boolean) => !playStatus && setTurboMode(e)}
                  playStatus={playStatus}
                />
              </div>
              <div className="grow" onClick={handleBetButton}>
                <BetButton
                  isMobile={true}
                  profitAmount={currentProfit && (betAmount * profitCalcList[currentProfit - 1]).toFixed(2)}
                  turboMode={turboMode}
                  cardLoading={cardLoading}
                  loading={loading}
                  type={btnActionStatus}
                />
              </div>
              <div onClick={() => setSettingModalOpen(true)}>
                <SettingBtn playStatus={playStatus} />
              </div>
            </div>
          </div>
        </div>
        <div className="game-landscape-left">
          <div className="wickets-control-group">
            <label>Wickets</label>
            <div className="mine-control-action">
              <MineBox
                isMobile={false}
                min={1}
                max={gridCount * gridCount - 1}
                value={mineCount}
                setValue={(e: number) => !playStatus && setMineCount(e)}
                playStatus={playStatus}
              />
            </div>
          </div>
          <div className="amount-control-group">
            <label>Bet Amount</label>
            <div className="amount-control-action">
              <AmountBox
                isMobile="desktop"
                minLimit={0.1}
                maxLimit={100}
                value={betAmount}
                setValue={(e: number) => !playStatus && setBetAmount(e)}
                playStatus={playStatus}
              />
            </div>
          </div>
        </div>
        <div className="game-landscape-right">
          <div className="turbo-control-group">
            <label>Turbo</label>
            <div className="turbo-control-action">
              <ToggleBox
                isMobile={false}
                value={turboMode}
                setValue={(e: boolean) => !playStatus && setTurboMode(e)}
                playStatus={playStatus}
              />
            </div>
          </div>
          <div className="btn-control-action" onClick={handleBetButton}>
            <BetButton
              isMobile={false}
              profitAmount={currentProfit && (betAmount * profitCalcList[currentProfit - 1]).toFixed(2)}
              turboMode={turboMode}
              cardLoading={cardLoading}
              loading={loading}
              type={btnActionStatus}
            />
          </div>
        </div>
      </div>
      <Modal open={resultModalOpen} setOpen={setResultModalOpen}>
        <div className="game-result-modal">
          <div
            className={`win_img ${
              profitCalcList[currentProfit - 1] >= 10
                ? '_win3'
                : profitCalcList[currentProfit - 1] >= 2
                ? '_win2'
                : '_win1'
            }`}
          />
          <div className="win-info-detail">
            <div className="win-amount">
              <p>${betAmount * profitCalcList[currentProfit - 1]}</p>
              <span>${betAmount * profitCalcList[currentProfit - 1]}</span>
            </div>
            <div className="win-amount-double">
              <p>X{profitCalcList[currentProfit - 1]}</p>
              <span>X{profitCalcList[currentProfit - 1]}</span>
            </div>
            <p className="win-text">Multiplier</p>
          </div>
        </div>
      </Modal>
      <Modal open={settingModalOpen} setOpen={setSettingModalOpen}>
        <div className="game-setting-modal">
          <div className="modal-close" onClick={() => setSettingModalOpen(false)}>
            &times;
          </div>
          <div className="game-setting-grid">
            <label>Grid</label>
            <div className="game-setting-grid-options">
              {gridSettingList.map((item: any, ind: number) => {
                return (
                  <div
                    key={ind}
                    className={`setting-grid-btn ${item.active && '_active'}`}
                    onClick={() => setGridSystem(item.grid, ind)}
                  >
                    <div className="setting-grid-btn-inner">{item.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="game-setting-wickets">
            <label>Wickets</label>
            <MineBox
              isMobile={true}
              min={1}
              max={gridCount * gridCount - 1}
              value={mineCount}
              setValue={(e: number) => !playStatus && setMineCount(e)}
              playStatus={playStatus}
            />
          </div>
          <div className="game-setting-amount">
            <label>Bet Amount</label>
            <AmountBox
              isMobile="modal"
              minLimit={0.1}
              maxLimit={100}
              value={betAmount}
              setValue={(e: number) => !playStatus && setBetAmount(e)}
              playStatus={playStatus}
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default GameManager;
