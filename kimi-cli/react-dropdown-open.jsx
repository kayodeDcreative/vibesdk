```javascript Import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import CSSTransition from 'react-transition-group/CSSTransition';

class Dropdown extends Component {
  constructor(props) {
    super(props);
    this.state = { isOpen: false };

    this.handleToggle = this.handleToggle.bind(this);
  }

  handleToggle() {
    this.setState((prevState) => ({ isOpen: !prevState.isOpen }));
  }

  render() {
    const { content } = this.props;
    const { isOpen } = this.state;

    return (
      <div>
        <button onClick={this.handleToggle}>Open Dropdown</button>
        <CSSTransition in={isOpen} timeout={300} classNames="dropdown">
          <div className="dropdown-content">{content}</div>
        </CSSTransition>
      </div>
    );
  }
}

Dropdown.propTypes = {
  content: PropTypes.node.isRequired,
};

export default Dropdown;

// Add your custom CSS for the dropdown and dropdown-content classes in a separate file

.dropdown-content {
  display: none;
  position: absolute;
  z-index: 1;
}

.dropdown-content.show {
  display: list-item;
}

.dropdown {
  position: relative;
}
```