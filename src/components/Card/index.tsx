import React from 'react';
import './card.scss';

const Card = ({ active, turbo, mine, playStatus, self, currentTarget, loading, turboMode, turboList }: any) => {
  return (
    <div
      className={`play-target-item ${
        (turboMode && !active) || (!active && playStatus) ? '_hover' : ' pointer-events-none'
      }`}
    >
      <div
        className={`target-item-inner ${!turboMode && !playStatus && 'before:opacity-[0.5]'} ${
          turboMode
            ? `${turbo && '_turbo_active'} ${
                active
                  ? mine
                    ? `_lose ${turboList.indexOf(self) >= 0 ? 'opacity-[1]' : 'opacity-[0.5]'}`
                    : '_win1'
                  : turboList.indexOf(self) >= 0 && '_turbo_active'
              } ${loading && turboList.indexOf(self) >= 0 && '_loading'}`
            : loading && currentTarget === self
            ? '_loading'
            : active && (mine ? `_lose ${currentTarget === self ? 'opacity-[1]' : 'opacity-[0.5]'}` : '_win1')
        }`}
      >
        {turboMode ? (
          !active && turboList.indexOf(self) >= 0 && <span className="turbo-mark">?</span>
        ) : (
          <span className="target-item-sum">$0.10</span>
        )}
      </div>
      {!active && <div className="_shadow" />}
    </div>
  );
};

export default Card;
