;(function () {
  const StarRatingInteractive = ({
    value = 0,
    max = 5,
    size = "text-yellow-500 text-xl",
    onChange,
  }) => {
    const handleClick = (index) => {
      if (onChange) onChange(index);
    };

    return (
      <div className="flex items-center gap-1 cursor-pointer">
        {Array.from({ length: max }).map((_, i) => {
          const index = i + 1;
          return (
            <i
              key={index}
              onClick={() => handleClick(index)}
              className={
                index <= value ? `fas fa-star ${size}` : `far fa-star ${size}`
              }
            />
          );
        })}
      </div>
    );
  };

  window.StarRatingInteractive = StarRatingInteractive;
})();
