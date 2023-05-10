import React from 'react';
import './profitbox.scss';

const ProfitBox = ({ item, ind, playStatus, turboMode, profitCalcList, currentProfit }: any) => {
  return (
    <div
      className={`history-item 
        ${
          currentProfit === ind &&
          (turboMode || playStatus) &&
          `history-item_active ${
            profitCalcList[ind] >= 10
              ? 'bg-yellow before:border-yellow after:border-yellow'
              : profitCalcList[ind] >= 2
              ? 'bg-green before:border-green after:border-green'
              : 'bg-blue before:border-blue after:border-blue'
          }`
        }`}
    >
      <span
        className={profitCalcList[ind] >= 10 ? 'text-yellow' : profitCalcList[ind] >= 2 ? 'text-green' : 'text-blue'}
      >{`X${item.value}`}</span>
    </div>
  );
};

export default ProfitBox;
